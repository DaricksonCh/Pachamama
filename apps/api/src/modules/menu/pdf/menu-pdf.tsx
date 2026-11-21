import { Document, Image, Page, renderToBuffer, StyleSheet, Text, View } from '@react-pdf/renderer';
import {
  ALLERGEN_CODES,
  ALLERGENS,
  type Diet,
  type Language,
  type PublicMenu,
  RESTAURANT_INFO,
} from '@pachamama/shared';
import { logoPng, renderWithFreshFonts } from './fonts';
import { formatPrice, pdfLabels } from './labels';
import { Chakana, Divider, ThinBand, WovenBand } from './ornaments';
import { colors, fonts, page } from './pdf-theme';

type Category = PublicMenu['categories'][number];
type Dish = Category['dishes'][number];

/** Foto de acento por categoría (máx. una): JPEG ya convertido, con el plato al que pertenece. */
export type CategoryPhoto = { dishId: number; data: Buffer };
export type CategoryPhotos = Map<number, CategoryPhoto>;

type Props = { menu: PublicMenu; lang: Language; photos?: CategoryPhotos };

const contentWidth = page.width - page.marginX * 2;

const s = StyleSheet.create({
  page: {
    backgroundColor: colors.cream,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 9.5,
    paddingTop: 58,
    paddingBottom: 64,
    paddingHorizontal: page.marginX,
  },
  // Portada
  cover: {
    backgroundColor: colors.cream,
    fontFamily: fonts.body,
    color: colors.green,
    alignItems: 'center',
  },
  coverBandTop: { position: 'absolute', top: 0, left: 0 },
  coverBandBottom: { position: 'absolute', bottom: 0, left: 0, transform: 'scaleY(-1)' },
  coverInner: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 30 },
  coverLogo: { width: 250 },
  coverTitle: {
    fontFamily: fonts.display,
    fontWeight: 600,
    fontSize: 44,
    color: colors.green,
    marginTop: 14,
    letterSpacing: 0.5,
  },
  coverTagline: {
    fontFamily: fonts.display,
    fontStyle: 'italic',
    fontSize: 16,
    color: colors.terracotta,
    marginTop: 6,
  },
  coverFooter: { alignItems: 'center', marginBottom: 62 },
  coverName: {
    fontWeight: 600,
    fontSize: 9.5,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: colors.green,
  },
  coverAddress: { fontSize: 9.5, color: colors.muted, marginTop: 4, letterSpacing: 0.4 },
  // Cabecera y pie fijos
  headerBand: { position: 'absolute', top: 0, left: 0 },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: page.marginX,
    right: page.marginX,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.6,
    borderTopColor: colors.line,
    paddingTop: 7,
    fontSize: 7.5,
    color: colors.muted,
    letterSpacing: 0.8,
  },
  footerName: { textTransform: 'uppercase', letterSpacing: 1.6 },
  // Categorías
  category: { marginBottom: 20 },
  categoryHead: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 6 },
  categoryTitleBox: { flexGrow: 1, flexShrink: 1, paddingRight: 12 },
  categoryKicker: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  categoryKickerLine: { width: 28, height: 1, backgroundColor: colors.mustard, marginLeft: 6 },
  categoryName: {
    fontFamily: fonts.display,
    fontWeight: 600,
    fontSize: 24,
    color: colors.green,
    lineHeight: 1.15,
  },
  categoryDescription: {
    fontFamily: fonts.display,
    fontStyle: 'italic',
    fontSize: 10.5,
    color: colors.muted,
    marginTop: 3,
    lineHeight: 1.35,
  },
  photoBox: { width: 158, alignItems: 'flex-end' },
  photo: { width: 158, height: 106, objectFit: 'cover', borderRadius: 5 },
  photoCaption: {
    fontFamily: fonts.display,
    fontStyle: 'italic',
    fontSize: 8,
    color: colors.muted,
    marginTop: 3,
  },
  // Platos
  dish: { paddingVertical: 7, borderBottomWidth: 0.5, borderBottomColor: colors.line },
  dishLast: { borderBottomWidth: 0 },
  dishTop: { flexDirection: 'row', alignItems: 'flex-end' },
  dishNameRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  dishName: { fontFamily: fonts.display, fontWeight: 600, fontSize: 12, color: colors.text },
  allergens: {
    fontFamily: fonts.body,
    fontSize: 7.5,
    color: colors.terracotta,
    letterSpacing: 0.6,
  },
  leader: {
    flexGrow: 1,
    borderBottomWidth: 0.9,
    borderBottomColor: colors.line,
    borderBottomStyle: 'dotted',
    marginHorizontal: 6,
    marginBottom: 3.5,
    minWidth: 16,
  },
  price: {
    fontFamily: fonts.body,
    fontWeight: 600,
    fontSize: 11,
    color: colors.green,
  },
  dishDescription: {
    fontSize: 8.8,
    color: colors.muted,
    marginTop: 2.5,
    marginRight: 70,
    lineHeight: 1.4,
  },
  tag: { borderRadius: 6, paddingHorizontal: 5, paddingTop: 1.6, paddingBottom: 1.2 },
  dishTag: { marginLeft: 6 },
  tagText: { fontSize: 6.4, fontWeight: 600, letterSpacing: 0.9, textTransform: 'uppercase' },
  empty: {
    fontFamily: fonts.display,
    fontStyle: 'italic',
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 120,
  },
  // Leyenda
  legendTitle: { fontFamily: fonts.display, fontWeight: 600, fontSize: 22, color: colors.green },
  legendGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  legendItem: { width: '50%', flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  legendLetter: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: colors.mustard,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  legendLetterText: { fontSize: 8, fontWeight: 600, color: colors.green },
  legendLabel: { fontSize: 9.5 },
  legendSection: { marginTop: 18 },
  dietRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  notice: { fontSize: 8.8, color: colors.muted, lineHeight: 1.5, marginTop: 8 },
  infoBox: {
    marginTop: 26,
    backgroundColor: colors.green,
    borderRadius: 6,
    paddingVertical: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
  },
  infoCol: { flexGrow: 1, flexBasis: 0 },
  infoTitle: {
    fontSize: 7.5,
    fontWeight: 600,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.mustard,
    marginBottom: 5,
  },
  infoText: { fontSize: 10, color: colors.cream, lineHeight: 1.45 },
  legendLogo: { width: 120, alignSelf: 'center', marginTop: 44 },
  infoName: { fontFamily: fonts.display, fontWeight: 600, fontSize: 14, color: colors.cream },
});

function DietTag({ diet, lang }: { diet: Diet; lang: Language }) {
  const vegan = diet === 'vegan';
  return (
    <View style={[s.tag, { backgroundColor: vegan ? colors.green : colors.mustard }]}>
      <Text style={[s.tagText, { color: vegan ? colors.cream : colors.green }]}>
        {pdfLabels[lang].diet[diet]}
      </Text>
    </View>
  );
}

function DishRow({ dish, lang, last }: { dish: Dish; lang: Language; last: boolean }) {
  const name = lang === 'de' ? dish.nameDe : dish.nameEs;
  const description = lang === 'de' ? dish.descriptionDe : dish.descriptionEs;
  return (
    <View style={last ? [s.dish, s.dishLast] : s.dish} wrap={false}>
      <View style={s.dishTop}>
        <View style={s.dishNameRow}>
          <Text style={s.dishName}>
            {name}
            {dish.allergens.length > 0 ? (
              <Text style={s.allergens}>{`  ${dish.allergens.join(' ')}`}</Text>
            ) : null}
          </Text>
          {dish.diet ? (
            <View style={s.dishTag}>
              <DietTag diet={dish.diet} lang={lang} />
            </View>
          ) : null}
        </View>
        <View style={s.leader} />
        <Text style={s.price}>{formatPrice(dish.price)}</Text>
      </View>
      {description ? <Text style={s.dishDescription}>{description}</Text> : null}
    </View>
  );
}

function CategorySection({
  category,
  lang,
  photo,
}: {
  category: Category;
  lang: Language;
  photo: CategoryPhoto | undefined;
}) {
  const name = lang === 'de' ? category.nameDe : category.nameEs;
  const description = lang === 'de' ? category.descriptionDe : category.descriptionEs;
  const photoDish = photo && category.dishes.find((d) => d.id === photo.dishId);
  const [first, ...rest] = category.dishes;
  return (
    <View style={s.category}>
      {/* La cabecera nunca se queda sola al final de una página: va unida al primer plato. */}
      <View wrap={false}>
        <View style={s.categoryHead}>
          <View style={s.categoryTitleBox}>
            <View style={s.categoryKicker}>
              <Chakana size={10} />
              <View style={s.categoryKickerLine} />
            </View>
            <Text style={s.categoryName}>{name}</Text>
            {description ? <Text style={s.categoryDescription}>{description}</Text> : null}
          </View>
          {photo && photoDish ? (
            <View style={s.photoBox}>
              <Image style={s.photo} src={{ data: photo.data, format: 'jpg' }} />
              <Text style={s.photoCaption}>
                {lang === 'de' ? photoDish.nameDe : photoDish.nameEs}
              </Text>
            </View>
          ) : null}
        </View>
        <Divider width={contentWidth} />
        {first ? <DishRow dish={first} lang={lang} last={rest.length === 0} /> : null}
      </View>
      {rest.map((dish, i) => (
        <DishRow key={dish.id} dish={dish} lang={lang} last={i === rest.length - 1} />
      ))}
    </View>
  );
}

function Footer({ lang }: { lang: Language }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerName}>{RESTAURANT_INFO.name}</Text>
      <Chakana size={8} />
      <Text render={({ pageNumber }) => `${pdfLabels[lang].page} ${pageNumber}`} />
    </View>
  );
}

function CoverPage({ lang }: { lang: Language }) {
  const t = pdfLabels[lang];
  const { street, postalCode, city } = RESTAURANT_INFO.address;
  return (
    <Page size="A4" style={s.cover}>
      <View style={s.coverBandTop}>
        <WovenBand width={page.width} />
      </View>
      <View style={s.coverInner}>
        <Image style={s.coverLogo} src={logoPng} />
        <Text style={s.coverTitle}>{t.menuTitle}</Text>
        <Text style={s.coverTagline}>{t.tagline}</Text>
      </View>
      <View style={s.coverFooter}>
        <Divider width={180} />
        <Text style={[s.coverName, { marginTop: 12 }]}>{RESTAURANT_INFO.name}</Text>
        <Text style={s.coverAddress}>{`${street} · ${postalCode} ${city}`}</Text>
      </View>
      <View style={s.coverBandBottom}>
        <WovenBand width={page.width} />
      </View>
    </Page>
  );
}

function LegendPage({ lang }: { lang: Language }) {
  const t = pdfLabels[lang];
  const { street, postalCode, city } = RESTAURANT_INFO.address;
  return (
    <Page size="A4" style={s.page}>
      <View style={s.headerBand} fixed>
        <ThinBand width={page.width} />
      </View>
      <Text style={s.legendTitle}>{t.allergensTitle}</Text>
      <View style={{ marginTop: 6 }}>
        <Divider width={contentWidth} />
      </View>
      <View style={s.legendGrid}>
        {ALLERGEN_CODES.map((code) => (
          <View key={code} style={s.legendItem}>
            <View style={s.legendLetter}>
              <Text style={s.legendLetterText}>{code}</Text>
            </View>
            <Text style={s.legendLabel}>{ALLERGENS[code][lang]}</Text>
          </View>
        ))}
      </View>
      <Text style={s.notice}>{t.lmivNotice}</Text>

      <View style={s.legendSection}>
        <Text style={[s.legendTitle, { fontSize: 15 }]}>{t.dietTitle}</Text>
        <View style={s.dietRow}>
          <DietTag diet="vegan" lang={lang} />
          <View style={{ width: 14 }} />
          <DietTag diet="vegetarian" lang={lang} />
        </View>
        <Text style={s.notice}>{t.pricesNotice}</Text>
      </View>

      <View style={s.infoBox} wrap={false}>
        <View style={s.infoCol}>
          <Text style={s.infoName}>{RESTAURANT_INFO.name}</Text>
          <Text style={[s.infoText, { marginTop: 4, color: colors.mustard }]}>{t.tagline}</Text>
        </View>
        <View style={s.infoCol}>
          <Text style={s.infoTitle}>{t.addressTitle}</Text>
          <Text style={s.infoText}>{street}</Text>
          <Text style={s.infoText}>{`${postalCode} ${city}`}</Text>
        </View>
        <View style={s.infoCol}>
          <Text style={s.infoTitle}>{t.hoursTitle}</Text>
          {RESTAURANT_INFO.openingHours[lang].split(' · ').map((line) => (
            <Text key={line} style={s.infoText}>
              {line}
            </Text>
          ))}
        </View>
      </View>
      <Image style={s.legendLogo} src={logoPng} />
      <Footer lang={lang} />
    </Page>
  );
}

/** Carta en PDF (A4): portada, una sección por categoría visible y página de leyenda. */
export function MenuPdf({ menu, lang, photos = new Map() }: Props) {
  const t = pdfLabels[lang];
  return (
    <Document
      title={t.documentTitle}
      author={RESTAURANT_INFO.name}
      subject={t.menuTitle}
      language={lang === 'de' ? 'de-DE' : 'es-ES'}
    >
      <CoverPage lang={lang} />
      <Page size="A4" style={s.page}>
        <View style={s.headerBand} fixed>
          <ThinBand width={page.width} />
        </View>
        {menu.categories.length === 0 ? <Text style={s.empty}>{t.emptyMenu}</Text> : null}
        {menu.categories.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            lang={lang}
            photo={photos.get(category.id)}
          />
        ))}
        <Footer lang={lang} />
      </Page>
      <LegendPage lang={lang} />
    </Document>
  );
}

export function renderMenuPdf(props: Props): Promise<Buffer> {
  return renderWithFreshFonts(() => renderToBuffer(<MenuPdf {...props} />));
}
