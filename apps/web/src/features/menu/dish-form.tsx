import { zodResolver } from '@hookform/resolvers/zod';
import {
  type AdminCategory,
  type AdminDish,
  type AllergenCode,
  DIETS,
  dishInputSchema,
  imageAltSchema,
  priceSchema,
} from '@pachamama/shared';
import { useEffect, useMemo, useState } from 'react';
import {
  Controller,
  type FieldErrors,
  type Path,
  type Resolver,
  useController,
  useForm,
  useWatch,
} from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api';
import { AllergenPicker } from './allergen-picker';
import { useRemoveDishImage, useSaveDish, useUploadDishImage } from './api';
import { FieldError, FormErrorSummary } from './form-error-summary';
import { applyServerErrors, errorKey } from './form-errors';
import { ImageField } from './image-field';
import { checkImageFile } from './image-file';
import { UnsavedChangesDialog } from './unsaved-changes-dialog';
import { useDishStatus } from './use-dish-status';
import { useUnsavedChanges } from './use-unsaved-changes';

const REQUIRED = 'validation.required';

/**
 * Schema del formulario: el de la API (`dishInputSchema`) adaptado a los controles
 * (precio como texto, dieta "ninguna" como '') más la foto y sus textos alternativos.
 */
const dishFormSchema = dishInputSchema.extend({
  // Vacío → "obligatorio"; si no, la misma regla de precio que la API ("12,90" o "12.90").
  price: z
    .string()
    .trim()
    .min(1, { error: REQUIRED })
    .transform((text, ctx) => {
      const parsed = priceSchema.safeParse(text);
      if (parsed.success) return parsed.data;
      ctx.issues.push({ code: 'custom', message: 'validation.price', input: text });
      return z.NEVER;
    }),
  diet: z.enum(['', ...DIETS]).transform((diet) => (diet === '' ? null : diet)),
  image: z.custom<File | null>(),
  removeImage: z.boolean(),
  imageAltDe: z.string().trim(),
  imageAltEs: z.string().trim(),
});

interface DishFormValues {
  categoryId: number | undefined;
  nameDe: string;
  nameEs: string;
  descriptionDe: string;
  descriptionEs: string;
  price: string;
  diet: '' | (typeof DIETS)[number];
  allergens: AllergenCode[];
  status: 'visible' | 'hidden';
  isProvisional: boolean;
  provisionalNote: string;
  image: File | null;
  removeImage: boolean;
  imageAltDe: string;
  imageAltEs: string;
}
type DishFormOutput = z.output<typeof dishFormSchema>;
type FieldName = Path<DishFormValues>;

/** Orden de los campos en pantalla (resumen de errores y foco). */
const FIELDS = [
  'categoryId',
  'nameDe',
  'nameEs',
  'descriptionDe',
  'descriptionEs',
  'price',
  'diet',
  'allergens',
  'image',
  'imageAltDe',
  'imageAltEs',
  'provisionalNote',
] as const satisfies readonly FieldName[];

const LABEL_KEYS: Record<(typeof FIELDS)[number], string> = {
  categoryId: 'admin.menu.dishes.form.category',
  nameDe: 'admin.menu.dishes.form.nameDe',
  nameEs: 'admin.menu.dishes.form.nameEs',
  descriptionDe: 'admin.menu.dishes.form.descriptionDe',
  descriptionEs: 'admin.menu.dishes.form.descriptionEs',
  price: 'admin.menu.dishes.form.price',
  diet: 'admin.menu.dishes.form.diet',
  allergens: 'admin.menu.dishes.form.allergens',
  image: 'admin.menu.dishes.form.photo',
  imageAltDe: 'admin.menu.dishes.form.altDe',
  imageAltEs: 'admin.menu.dishes.form.altEs',
  provisionalNote: 'admin.menu.dishes.form.provisionalNote',
};

const DESCRIPTION_MAX = 1000;
const idOf = (field: FieldName) => {
  if (field === 'allergens') return 'dish-allergen-A';
  if (field === 'diet') return 'dish-diet-none';
  return `dish-${field}`;
};

function toDefaults(dish?: AdminDish, categoryId?: number): DishFormValues {
  return {
    categoryId: dish?.categoryId ?? categoryId,
    nameDe: dish?.nameDe ?? '',
    nameEs: dish?.nameEs ?? '',
    descriptionDe: dish?.descriptionDe ?? '',
    descriptionEs: dish?.descriptionEs ?? '',
    // Con coma decimal, como se escribe en alemán y en español ("9,50").
    price: dish ? dish.price.toFixed(2).replace('.', ',') : '',
    diet: dish?.diet ?? '',
    allergens: dish?.allergens ?? [],
    status: dish?.status === 'hidden' ? 'hidden' : 'visible',
    isProvisional: dish?.isProvisional ?? false,
    provisionalNote: dish?.provisionalNote ?? '',
    image: null,
    removeImage: false,
    imageAltDe: dish?.imageAltDe ?? '',
    imageAltEs: dish?.imageAltEs ?? '',
  };
}

/** ¿El plato tendrá foto al guardar? (una nueva, o la guardada si no se quita). */
const willHaveImage = (image: File | null, removeImage: boolean, hasSavedImage: boolean) =>
  image !== null || (hasSavedImage && !removeImage);

/**
 * El resolver de Zod más la regla "alt de/es obligatorios si hay foto", que se comprueba
 * siempre (no solo cuando el resto es válido) para mostrar todos los errores a la vez.
 */
function makeResolver(hasSavedImage: boolean): Resolver<DishFormValues, unknown, DishFormOutput> {
  const base = zodResolver(dishFormSchema) as unknown as Resolver<
    DishFormValues,
    unknown,
    DishFormOutput
  >;
  return async (values, context, options) => {
    const result = await base(values, context, options);
    if (!willHaveImage(values.image, values.removeImage, hasSavedImage)) return result;
    const altErrors: FieldErrors<DishFormValues> = {};
    for (const [field, value] of [
      ['imageAltDe', values.imageAltDe],
      ['imageAltEs', values.imageAltEs],
    ] as const) {
      const check = imageAltSchema.shape.altDe.safeParse(value);
      if (!check.success) {
        altErrors[field] = { type: 'custom', message: check.error.issues[0]?.message ?? REQUIRED };
      }
    }
    if (Object.keys(altErrors).length === 0) return result;
    return { values: {}, errors: { ...result.errors, ...altErrors } };
  };
}

/** Clave i18n de un fallo al subir la foto. */
function imageErrorKey(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 413) return 'validation.imageTooLarge';
    if (err.status === 415) return 'validation.imageType';
  }
  return 'admin.menu.dishes.errors.imageFailed';
}

type Done = { kind: 'saved' | 'createdWithoutImage'; dish: AdminDish };

/**
 * Formulario de plato (alta y edición). `readOnly`: el personal solo consulta, salvo el
 * interruptor Visible/Oculto, que guarda al momento. Al dar de alta con foto, si la foto
 * falla el plato ya existe: se avisa con `onCreatedWithoutImage` para seguir editándolo.
 */
export function DishForm({
  dish,
  categories,
  defaultCategoryId,
  readOnly = false,
  onSaved,
  onCreatedWithoutImage,
}: {
  dish?: AdminDish;
  /** Categorías activas (no archivadas) para el selector. */
  categories: AdminCategory[];
  defaultCategoryId?: number;
  readOnly?: boolean;
  onSaved: (saved: AdminDish) => void;
  onCreatedWithoutImage: (created: AdminDish) => void;
}) {
  const { t, i18n } = useTranslation();
  const save = useSaveDish();
  const upload = useUploadDishImage();
  const removeImage = useRemoveDishImage();
  const nameOf = (d: AdminDish) => (i18n.language === 'es' ? d.nameEs : d.nameDe);
  const dishStatus = useDishStatus(nameOf);
  const [done, setDone] = useState<Done | null>(null);
  const hasSavedImage = Boolean(dish?.imageUrl);
  const resolver = useMemo(() => makeResolver(hasSavedImage), [hasSavedImage]);
  const {
    register,
    control,
    handleSubmit,
    setError,
    clearErrors,
    setFocus,
    formState: { errors, isDirty, isSubmitting, submitCount },
  } = useForm<DishFormValues, unknown, DishFormOutput>({
    resolver,
    defaultValues: toDefaults(dish, defaultCategoryId),
  });
  const blocker = useUnsavedChanges(isDirty && !done);
  const imageField = useController({ control, name: 'image' });
  const removeField = useController({ control, name: 'removeImage' });
  const [descriptionDe, descriptionEs, isProvisional] = useWatch({
    control,
    name: ['descriptionDe', 'descriptionEs', 'isProvisional'],
  });

  // Se avisa tras renderizar con `done`, para que el bloqueo ya no esté activo al navegar.
  useEffect(() => {
    if (done?.kind === 'saved') onSaved(done.dish);
    if (done?.kind === 'createdWithoutImage') onCreatedWithoutImage(done.dish);
  }, [done, onSaved, onCreatedWithoutImage]);

  const isArchived = dish?.status === 'archived';
  const hasImage = willHaveImage(imageField.field.value, removeField.field.value, hasSavedImage);

  const onSubmit = handleSubmit(async (values) => {
    const { image, removeImage: remove, imageAltDe, imageAltEs, status, ...rest } = values;
    const keepSavedImage = hasSavedImage && !remove && !image;
    // Un plato archivado se restaura desde el listado o la ficha, no desde aquí.
    const data = {
      ...rest,
      ...(isArchived ? {} : { status }),
      ...(keepSavedImage ? { imageAltDe, imageAltEs } : {}),
    };
    let saved: AdminDish;
    try {
      saved = await save.mutateAsync({ id: dish?.id, data });
    } catch (err) {
      if (applyServerErrors(err, FIELDS, setError)) return;
      toast.error(t('admin.menu.errors.saveFailed'));
      return;
    }

    try {
      if (image) {
        saved = await upload.mutateAsync({
          id: saved.id,
          file: image,
          altDe: imageAltDe,
          altEs: imageAltEs,
        });
      } else if (remove && hasSavedImage) {
        await removeImage.mutateAsync(saved.id);
      }
    } catch (err) {
      if (!dish) {
        toast.warning(t('admin.menu.dishes.errors.createdWithoutImage'));
        setDone({ kind: 'createdWithoutImage', dish: saved });
        return;
      }
      const aliases = { imageAltDe: 'altDe', imageAltEs: 'altEs' };
      if (!applyServerErrors(err, FIELDS, setError, aliases)) {
        setError('image', { message: imageErrorKey(err) });
      }
      toast.error(t('admin.menu.dishes.errors.imageFailed'));
      return;
    }

    toast.success(t('admin.menu.dishes.saved'));
    setDone({ kind: 'saved', dish: saved });
  });

  const invalidFields = FIELDS.filter((field) => errors[field]?.message);
  const errorOf = (field: FieldName) =>
    errorKey((errors as Record<string, { message?: string } | undefined>)[field]?.message);

  /** Props comunes de un control con etiqueta, ayuda y error accesibles. */
  const a11y = (name: FieldName, opts: { required?: boolean; hint?: boolean } = {}) => {
    const error = errorOf(name);
    const describedBy = [
      opts.hint ? `${idOf(name)}-hint` : null,
      error ? `${idOf(name)}-error` : null,
    ].filter(Boolean);
    return {
      id: idOf(name),
      disabled: readOnly,
      'aria-required': opts.required ? (true as const) : undefined,
      'aria-invalid': error ? (true as const) : undefined,
      'aria-describedby': describedBy.length > 0 ? describedBy.join(' ') : undefined,
    };
  };

  const label = (name: (typeof FIELDS)[number], required = false) => (
    <Label htmlFor={idOf(name)}>
      {t(LABEL_KEYS[name])}
      {required && !readOnly ? <span aria-hidden="true"> *</span> : null}
    </Label>
  );

  const textField = (name: 'nameDe' | 'nameEs' | 'imageAltDe' | 'imageAltEs', required = true) => {
    const isAlt = name === 'imageAltDe' || name === 'imageAltEs';
    return (
      <div className="space-y-2">
        {label(name, required)}
        <Input {...a11y(name, { required, hint: isAlt })} {...register(name)} />
        {isAlt ? (
          <p id={`${idOf(name)}-hint`} className="text-sm text-muted-foreground">
            {t('admin.menu.dishes.form.altHint')}
          </p>
        ) : null}
        <FieldError id={`${idOf(name)}-error`} message={errorOf(name)} />
      </div>
    );
  };

  const descriptionField = (name: 'descriptionDe' | 'descriptionEs', value: string) => (
    <div className="space-y-2">
      {label(name)}
      <Textarea rows={3} {...a11y(name, { hint: true })} {...register(name)} />
      <p id={`${idOf(name)}-hint`} className="text-sm text-muted-foreground">
        {t('admin.menu.dishes.form.counter', { count: value.length, max: DESCRIPTION_MAX })}
      </p>
      <FieldError id={`${idOf(name)}-error`} message={errorOf(name)} />
    </div>
  );

  const categoryOptions = categories.filter(
    (c) => c.status !== 'archived' || c.id === dish?.categoryId,
  );

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-3xl space-y-6">
      {submitCount > 0 ? (
        <FormErrorSummary
          items={invalidFields.map((field) => ({
            id: idOf(field),
            label: t(LABEL_KEYS[field]),
            message: errorOf(field) ?? '',
            focus: () =>
              field === 'image' || field === 'diet' || field === 'allergens'
                ? document.getElementById(idOf(field))?.focus()
                : setFocus(field),
          }))}
        />
      ) : null}
      {readOnly ? null : (
        <p className="text-sm text-muted-foreground">{t('admin.menu.dishes.form.requiredHint')}</p>
      )}

      <div className="space-y-2">
        {label('categoryId', true)}
        <NativeSelect
          {...a11y('categoryId', { required: true })}
          {...register('categoryId', {
            setValueAs: (value: string) => (value === '' ? undefined : Number(value)),
          })}
          className="sm:max-w-sm"
        >
          <option value="">{t('admin.menu.dishes.form.chooseCategory')}</option>
          {categoryOptions.map((category) => (
            <option key={category.id} value={category.id}>
              {i18n.language === 'es' ? category.nameEs : category.nameDe}
            </option>
          ))}
        </NativeSelect>
        <FieldError id={`${idOf('categoryId')}-error`} message={errorOf('categoryId')} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {textField('nameDe')}
        {textField('nameEs')}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {descriptionField('descriptionDe', descriptionDe)}
        {descriptionField('descriptionEs', descriptionEs)}
      </div>

      <div className="space-y-2">
        {label('price', true)}
        <Input
          inputMode="decimal"
          autoComplete="off"
          className="sm:max-w-40"
          {...a11y('price', { required: true, hint: true })}
          {...register('price')}
        />
        <p id={`${idOf('price')}-hint`} className="text-sm text-muted-foreground">
          {t('admin.menu.dishes.form.priceHint')}
        </p>
        <FieldError id={`${idOf('price')}-error`} message={errorOf('price')} />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t('admin.menu.dishes.form.diet')}</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {(
            [
              ['', 'none', 'dietNone'],
              ['vegetarian', 'vegetarian', 'dietVegetarian'],
              ['vegan', 'vegan', 'dietVegan'],
            ] as const
          ).map(([value, suffix, key]) => (
            <div key={suffix} className="flex items-center gap-2">
              <input
                type="radio"
                id={`dish-diet-${suffix}`}
                value={value}
                disabled={readOnly}
                className="size-4 accent-primary"
                {...register('diet')}
              />
              <label htmlFor={`dish-diet-${suffix}`} className="text-sm">
                {t(`admin.menu.dishes.form.${key}`)}
              </label>
            </div>
          ))}
        </div>
      </fieldset>

      <AllergenPicker
        idPrefix="dish-allergen"
        inputProps={register('allergens')}
        disabled={readOnly}
      />

      <ImageField
        id={idOf('image')}
        currentUrl={dish?.imageUrl?.w400 ?? null}
        file={imageField.field.value}
        removed={removeField.field.value}
        readOnly={readOnly}
        error={errorOf('image')}
        onSelect={(file) => {
          const problem = checkImageFile(file);
          if (problem) {
            setError('image', { message: problem });
            return false;
          }
          clearErrors('image');
          imageField.field.onChange(file);
          removeField.field.onChange(false);
          return true;
        }}
        onRemove={() => {
          clearErrors(['image', 'imageAltDe', 'imageAltEs']);
          if (imageField.field.value) imageField.field.onChange(null);
          else removeField.field.onChange(true);
        }}
        onKeep={() => removeField.field.onChange(false)}
      >
        {hasImage ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {textField('imageAltDe')}
            {textField('imageAltEs')}
          </div>
        ) : null}
      </ImageField>

      {isArchived ? null : readOnly && dish ? (
        <div className="flex items-center gap-3">
          <Switch
            id="dish-status"
            checked={dish.status === 'visible'}
            disabled={dishStatus.isPending}
            onCheckedChange={() => void dishStatus.toggleVisible(dish)}
          />
          <Label htmlFor="dish-status">{t('admin.menu.dishes.form.visible')}</Label>
        </div>
      ) : (
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <div className="flex items-center gap-3">
              <Switch
                id="dish-status"
                disabled={readOnly}
                checked={field.value === 'visible'}
                onCheckedChange={(on) => field.onChange(on ? 'visible' : 'hidden')}
              />
              <Label htmlFor="dish-status">{t('admin.menu.dishes.form.visible')}</Label>
            </div>
          )}
        />
      )}

      <div className="space-y-3">
        <Controller
          control={control}
          name="isProvisional"
          render={({ field }) => (
            <div className="flex items-center gap-3">
              <Switch
                id="dish-isProvisional"
                disabled={readOnly}
                checked={field.value}
                onCheckedChange={field.onChange}
              />
              <Label htmlFor="dish-isProvisional">{t('admin.menu.dishes.form.provisional')}</Label>
            </div>
          )}
        />
        {isProvisional ? (
          <div className="space-y-2">
            {label('provisionalNote')}
            <Textarea rows={2} {...a11y('provisionalNote')} {...register('provisionalNote')} />
            <FieldError
              id={`${idOf('provisionalNote')}-error`}
              message={errorOf('provisionalNote')}
            />
          </div>
        ) : null}
      </div>

      {readOnly ? null : (
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('admin.menu.saving') : t('admin.menu.save')}
        </Button>
      )}
      <UnsavedChangesDialog blocker={blocker} />
    </form>
  );
}
