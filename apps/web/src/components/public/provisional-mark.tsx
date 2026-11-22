import { contactIsProvisional } from '@pachamama/shared';
import { useTranslation } from 'react-i18next';

/** Visible "(provisional)" marker shown after phone/email while they are placeholders. */
export function ProvisionalMark() {
  const { t } = useTranslation();
  if (!contactIsProvisional()) return null;
  return <span className="ml-1 text-sm font-normal opacity-80">({t('contact.provisional')})</span>;
}
