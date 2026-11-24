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
import { chunk, columnsFor, type PdfTone, textColorFor, toneFor } from './layout';
import { Chakana, PhotoPlaceholder, RhombRow, WovenBand } from './ornaments';
import type { DishPhotos } from './photos';
import { colors, fonts, page } from './pdf-theme';

type Category = PublicMenu['categories'][number];
type Dish = Category['dishes'][number];

type Props = { menu: PublicMenu; lang: Language; photos?: DishPhotos };

const contentWidth = page.width - page.marginX * 2;

/** Medidas de cada rejilla (ADR 0017): 2 columnas por defecto, 3 en las categorías cortas. */
const GRID = {
  2: { gap: 26, photoHeight: 116, nameSize: 12.5, descSize: 8.4 },
  3: { gap: 16, photoHeight: 78, nameSize: 11, descSize: 8 },
} as const;
const cardWidth = (cols: 2 | 3) => (contentWidth - GRID[cols].gap * (cols - 1)) / cols;
const POLAROID_PAD = 6;

const s = StyleSheet.create({
  page: {
    backgroundColor: colors.page,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 9.5,
    paddingTop: 46,
    paddingBottom: 60,
    paddingHorizontal: page.marginX,
  },
  // Portada: tapa de álbum con una etiqueta de papel pegada (sin platos).
  cover: { backgroundColor: colors.selva, fontFamily: fonts.body },
  coverBandTop: { position: 'absolute', top: 34, left: 0 },
  coverBandBottom: { position: 'absolute', bottom: 34, left: 0 },
  label: {
    position: 'absolute',
    top: 214,
    left: 92,
    right: 92,
    backgroundColor: colors.paper,
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 30,
    alignItems: 'center',
    transform: 'rotate(-1deg)',
  },
  labelTapeLeft: { position: 'absolute', top: -6, left: 4, transform: 'rotate(-32deg)' },
  labelTapeRight: { position: 'absolute', bottom: 6, right: -20, transform: 'rotate(-32deg)' },
  coverLogo: { width: 128 },
  coverTitle: {
    fontFamily: fonts.display,
    fontWeight: 600,
    fontSize: 54,
    color: colors.selva,
    marginTop: 10,
  },
  coverLine: {
    fontFamily: fonts.script,
    fontWeight: 500,
    fontSize: 21,
    color: colors.chicha,
    marginTop: 6,
    textAlign: 'center',
  },
  coverRule: { marginTop: 16 },
  coverAddress: { fontSize: 9.5, color: colors.muted, marginTop: 10, letterSpacing: 0.4 },
  coverNote: {
    position: 'absolute',
    top: 606,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: fonts.script,
    fontWeight: 500,
    fontSize: 26,
    color: colors.maiz,
    transform: 'rotate(-2deg)',
  },
  // Pie fijo
  footer: {
    position: 'absolute',
    bottom: 22,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: fonts.script,
    fontWeight: 500,
    fontSize: 15,
    color: colors.muted,
  },
  // Categorías
  category: { marginBottom: 10 },
  categoryHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    borderBottomWidth: 0.8,
    borderBottomColor: colors.line,
    paddingBottom: 5,
    marginBottom: 16,
  },
  categoryName: {
    fontFamily: fonts.display,
    fontWeight: 600,
    fontSize: 26,
    color: colors.selva,
    marginRight: 12,
  },
  categoryNote: { fontFamily: fonts.script, fontWeight: 500, fontSize: 18, marginBottom: 2 },
  row: { flexDirection: 'row', marginBottom: 16 },
  // Polaroid y cinta
  polaroid: {
    backgroundColor: colors.paper,
    padding: POLAROID_PAD,
    borderWidth: 0.6,
    borderColor: colors.frame,
  },
  tape: { position: 'absolute', width: 52, height: 13, opacity: 0.85 },
  photo: { objectFit: 'cover' },
  // Platos
  dishTop: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8 },
  dishName: {
    fontFamily: fonts.display,
    fontWeight: 600,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  price: { fontWeight: 600, fontSize: 10.5, marginLeft: 8, flexShrink: 0 },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  allergens: { fontSize: 7, color: colors.muted, letterSpacing: 0.4 },
  description: { color: colors.muted, lineHeight: 1.4, marginTop: 3 },
  tag: {
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingTop: 1.6,
    paddingBottom: 1.2,
    marginRight: 6,
  },
  tagText: { fontSize: 6.6, fontWeight: 600, letterSpacing: 0.6 },
  empty: {
    fontFamily: fonts.display,
    fontStyle: 'italic',
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 120,
  },
  // Leyenda
  legendTitle: { fontFamily: fonts.display, fontWeight: 600, fontSize: 24, color: colors.selva },
  legendRule: { borderBottomWidth: 0.8, borderBottomColor: colors.line, marginTop: 5 },
  legendGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  legendItem: { width: '50%', flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  legendLetter: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: colors.maiz,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  legendLetterText: { fontSize: 8, fontWeight: 600, color: colors.text },
  legendLabel: { fontSize: 9.5 },
  legendSection: { marginTop: 18 },
  dietRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  notice: { fontSize: 8.8, color: colors.muted, lineHeight: 1.5, marginTop: 8 },
  infoBox: {
    marginTop: 26,
    backgroundColor: colors.selva,
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
    color: colors.maiz,
    marginBottom: 5,
  },
  infoText: { fontSize: 10, color: colors.paper, lineHeight: 1.45 },
  infoName: { fontFamily: fonts.display, fontWeight: 600, fontSize: 14, color: colors.paper },
  legendLogo: { width: 120, alignSelf: 'center', marginTop: 44 },
});

function DietTag({ diet, lang }: { diet: Diet; lang: Language }) {
  const vegan = diet === 'vegan';
  return (
    <View style={[s.tag, { backgroundColor: vegan ? colors.selva : colors.maiz }]}>
      <Text style={[s.tagText, { color: vegan ? colors.paper : colors.text }]}>
        {pdfLabels[lang].diet[diet]}
      </Text>
    </View>
  );
}

/** Foto del plato en su polaroid, con la cinta del color de la categoría. Hueco fijo. */
function Polaroid({
  photo,
  width,
  height,
  tone,
  tilt,
}: {
  photo: Buffer | undefined;
  width: number;
  height: number;
  tone: PdfTone;
  tilt: number;
}) {
  const inner = width - POLAROID_PAD * 2;
  return (
    <View style={[s.polaroid, { width, transform: `rotate(${tilt}deg)` }]}>
      {photo ? (
        <Image style={[s.photo, { width: inner, height }]} src={{ data: photo, format: 'jpg' }} />
      ) : (
        <PhotoPlaceholder width={inner} height={height} color={tone.band} />
      )}
      <View
        style={[
          s.tape,
          { top: -6, left: width / 2 - 26, backgroundColor: tone.band, transform: 'rotate(-3deg)' },
        ]}
      />
    </View>
  );
}

function DishCard({
  dish,
  lang,
  cols,
  tone,
  index,
  photo,
}: {
  dish: Dish;
  lang: Language;
  cols: 2 | 3;
  tone: PdfTone;
  index: number;
  photo: Buffer | undefined;
}) {
  const t = pdfLabels[lang];
  const grid = GRID[cols];
  const width = cardWidth(cols);
  const name = lang === 'de' ? dish.nameDe : dish.nameEs;
  const description = lang === 'de' ? dish.descriptionDe : dish.descriptionEs;
  // Leve giro alterno, como fotos pegadas a mano.
  const tilt = cols === 2 ? (index % 2 ? 1.2 : -1.2) : (index % 3) - 1;
  return (
    <View style={{ width }}>
      <Polaroid photo={photo} width={width} height={grid.photoHeight} tone={tone} tilt={tilt} />
      <View style={s.dishTop}>
        <Text style={[s.dishName, { fontSize: grid.nameSize }]}>{name}</Text>
        <Text style={[s.price, { color: textColorFor(tone) }]}>{formatPrice(dish.price)}</Text>
      </View>
      {dish.diet || dish.allergens.length > 0 ? (
        <View style={s.meta}>
          {dish.diet ? <DietTag diet={dish.diet} lang={lang} /> : null}
          {dish.allergens.length > 0 ? (
            <Text style={s.allergens}>{`${t.allergensShort} ${dish.allergens.join(' ')}`}</Text>
          ) : null}
        </View>
      ) : null}
      {description ? (
        <Text style={[s.description, { fontSize: grid.descSize }]}>{description}</Text>
      ) : null}
    </View>
  );
}

function CategorySection({
  category,
  index,
  lang,
  photos,
}: {
  category: Category;
  index: number;
  lang: Language;
  photos: DishPhotos;
}) {
  const name = lang === 'de' ? category.nameDe : category.nameEs;
  const note = lang === 'de' ? category.descriptionDe : category.descriptionEs;
  const tone = toneFor(index);
  const cols = columnsFor(category);
  const gap = GRID[cols].gap;
  const rows = chunk(category.dishes, cols);
  const renderRow = (row: Dish[], r: number) => (
    // Cada fila entera en una página: las fotos nunca se parten ni se montan.
    <View key={r} style={s.row} wrap={false}>
      {row.map((dish, i) => (
        <View key={dish.id} style={{ marginRight: i < cols - 1 ? gap : 0 }}>
          <DishCard
            dish={dish}
            lang={lang}
            cols={cols}
            tone={tone}
            index={r * cols + i}
            photo={photos.get(dish.id)}
          />
        </View>
      ))}
    </View>
  );
  const [first, ...rest] = rows;
  return (
    <View style={s.category}>
      {/* La cabecera nunca se queda sola al final de una página: va unida a la primera fila. */}
      <View wrap={false}>
        <View style={s.categoryHead}>
          <Text style={s.categoryName}>{name}</Text>
          {note ? (
            <Text style={[s.categoryNote, { color: textColorFor(tone) }]}>{note}</Text>
          ) : null}
        </View>
        {first ? renderRow(first, 0) : null}
      </View>
      {rest.map((row, r) => renderRow(row, r + 1))}
    </View>
  );
}

function Footer() {
  return <Text style={s.footer} fixed render={({ pageNumber }) => `— ${pageNumber} —`} />;
}

function CoverPage({ lang }: { lang: Language }) {
  const t = pdfLabels[lang];
  const { street, postalCode, city } = RESTAURANT_INFO.address;
  return (
    <Page size="A4" style={s.cover}>
      <View style={s.coverBandTop}>
        <WovenBand width={page.width} />
      </View>
      <View style={s.label}>
        <Image style={s.coverLogo} src={logoPng} />
        <Text style={s.coverTitle}>{t.menuTitle}</Text>
        <Text style={s.coverLine}>{t.coverLine}</Text>
        <View style={s.coverRule}>
          <RhombRow width={180} />
        </View>
        <Text style={s.coverAddress}>{`${street} · ${postalCode} ${city}`}</Text>
        <View style={[s.tape, s.labelTapeLeft, { backgroundColor: colors.maiz }]} />
        <View style={[s.tape, s.labelTapeRight, { backgroundColor: colors.aji }]} />
      </View>
      <Text style={s.coverNote}>{t.tagline}</Text>
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
      <Text style={s.legendTitle}>{t.allergensTitle}</Text>
      <View style={s.legendRule} />
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
        <Text style={[s.legendTitle, { fontSize: 16 }]}>{t.dietTitle}</Text>
        <View style={s.dietRow}>
          <DietTag diet="vegan" lang={lang} />
          <View style={{ width: 8 }} />
          <DietTag diet="vegetarian" lang={lang} />
        </View>
        <Text style={s.notice}>{t.pricesNotice}</Text>
      </View>

      <View style={s.infoBox} wrap={false}>
        <View style={s.infoCol}>
          <Text style={s.infoName}>{RESTAURANT_INFO.name}</Text>
          <Text style={[s.infoText, { marginTop: 4, color: colors.maiz }]}>{t.tagline}</Text>
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
      <View style={{ alignSelf: 'center', marginTop: 14 }}>
        <Chakana size={10} />
      </View>
      <Footer />
    </Page>
  );
}

/**
 * Carta en PDF (A4), «El recetario» (ADR 0017): portada de álbum, una sección por categoría
 * visible con la foto y la descripción de cada plato, y página de leyenda.
 */
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
        {menu.categories.length === 0 ? <Text style={s.empty}>{t.emptyMenu}</Text> : null}
        {menu.categories.map((category, i) => (
          <CategorySection
            key={category.id}
            category={category}
            index={i}
            lang={lang}
            photos={photos}
          />
        ))}
        <Footer />
      </Page>
      <LegendPage lang={lang} />
    </Document>
  );
}

export function renderMenuPdf(props: Props): Promise<Buffer> {
  return renderWithFreshFonts(() => renderToBuffer(<MenuPdf {...props} />));
}
