import { useTranslation } from 'react-i18next';
import { Photo } from '@/components/public/photo';
import { StoryGallery } from '@/components/public/story/story-gallery';
import { StoryHero } from '@/components/public/story/story-hero';
import { StoryManifesto } from '@/components/public/story/story-manifesto';
import { StoryName } from '@/components/public/story/story-name';
import { StorySplit } from '@/components/public/story/story-split';
import { usePageMeta } from '@/components/public/use-page-meta';

/**
 * Story page, built from blocks that each have their own touch (ADR 0013).
 * The real text is pending (docs/pendientes.md): placeholder copy plus a visible note.
 */
export function StoryPage() {
  const { t } = useTranslation();
  usePageMeta(t('pages.story.title'), t('pages.story.description'));

  return (
    <>
      <StoryHero />

      <div className="mt-16 md:mt-24">
        <StorySplit
          chapter="origin"
          paragraphs={[t('story.chapters.origin.p1'), t('story.chapters.origin.p2')]}
          media={
            <Photo
              photo="cocinera"
              alt={t('story.photos.cocinera')}
              sizes="(min-width: 768px) 50vw, 100vw"
            />
          }
        />
      </div>

      <StorySplit
        chapter="family"
        variant="tilted"
        tone="sand"
        reverse
        paragraphs={[t('story.chapters.family.p1')]}
        media={
          <Photo
            photo="equipo"
            alt={t('story.photos.equipo')}
            sizes="(min-width: 768px) 28rem, 90vw"
            className="aspect-[1280/1091]"
          />
        }
      >
        <p className="font-script text-3xl text-selva">{t('story.chapters.family.signature')}</p>
      </StorySplit>

      <StoryName />

      <StorySplit
        chapter="kitchen"
        variant="duo"
        paragraphs={[t('story.chapters.kitchen.p1')]}
        media={
          <>
            <Photo
              photo="mesaSurtida"
              alt={t('story.photos.mesaSurtida')}
              sizes="(min-width: 768px) 30vw, 60vw"
            />
            <Photo
              photo="tamal"
              alt={t('story.photos.tamal')}
              sizes="(min-width: 768px) 20vw, 40vw"
            />
          </>
        }
      />

      <StoryManifesto />
      <StoryGallery />
    </>
  );
}
