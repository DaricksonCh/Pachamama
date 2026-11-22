import { RESTAURANT_INFO, publicPath } from '@pachamama/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { textLinkClass } from '@/components/public/styles';
import { useLang } from '@/components/public/use-lang';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { optionClass } from '../option-class';

interface PartyStepProps {
  partySize: number | undefined;
  partyMin: number;
  partyMax: number;
  onChange: (partySize: number) => void;
}

/** Step 1: how many people. Bigger groups are sent to the phone or the contact page. */
export function PartyStep({ partySize, partyMin, partyMax, onChange }: PartyStepProps) {
  const { t } = useTranslation();
  const lang = useLang();
  const [showMore, setShowMore] = useState(false);
  const sizes = Array.from({ length: partyMax - partyMin + 1 }, (_, i) => partyMin + i);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          role="radiogroup"
          aria-label={t('reservations.party.groupLabel')}
          spacing={2}
          value={partySize === undefined ? '' : String(partySize)}
          onValueChange={(value) => {
            if (value) onChange(Number(value));
          }}
          className="flex flex-wrap gap-2"
        >
          {sizes.map((size) => (
            <ToggleGroupItem
              key={size}
              value={String(size)}
              aria-label={t('reservations.party.option', { count: size })}
              className={optionClass('size-12 text-lg')}
            >
              {size}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <button
          type="button"
          aria-expanded={showMore}
          aria-controls="party-more"
          onClick={() => setShowMore((v) => !v)}
          className="inline-flex min-h-12 items-center rounded-md px-3 font-semibold text-selva underline decoration-maiz decoration-2 underline-offset-[6px] hover:decoration-selva focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {t('reservations.party.more')}
        </button>
      </div>
      <div id="party-more" hidden={!showMore}>
        {showMore ? (
          <p className="rounded-md border border-maiz/60 bg-white p-4 leading-relaxed">
            {t('reservations.party.moreText', { max: partyMax })}{' '}
            <a href={`tel:${RESTAURANT_INFO.phone.e164}`} className={textLinkClass}>
              {RESTAURANT_INFO.phone.display}
            </a>{' '}
            {t('reservations.party.orContact')}{' '}
            <Link to={publicPath('contact', lang)} className={textLinkClass}>
              {t('reservations.party.contactLink')}
            </Link>
            .
          </p>
        ) : null}
      </div>
    </div>
  );
}
