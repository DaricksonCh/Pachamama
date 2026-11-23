import { useTranslation } from 'react-i18next';
import { HomeHero } from '@/components/public/home/home-hero';
import { HomeKitchen } from '@/components/public/home/home-kitchen';
import { HomeStory } from '@/components/public/home/home-story';
import { HomeVisit } from '@/components/public/home/home-visit';
import { usePageMeta } from '@/components/public/use-page-meta';
import { WovenStripe } from '@/components/public/woven-stripe';

/**
 * Home page, told in blocks (ADR 0015): the name, the story, the kitchen and the visit.
 * Story and kitchen copy are placeholders until the real texts arrive (docs/pendientes.md).
 */
export function HomePage() {
  const { t } = useTranslation();
  usePageMeta(undefined, t('meta.homeDescription'));

  return (
    <>
      <HomeHero />
      <WovenStripe />
      <HomeStory />
      <HomeKitchen />
      <HomeVisit />
    </>
  );
}
