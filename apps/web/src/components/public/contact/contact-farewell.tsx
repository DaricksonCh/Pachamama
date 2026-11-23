import { ReserveButton } from '../reserve-button';

/** Contact block 4: a short handwritten goodbye and the reserve button. */
export function ContactFarewell() {
  return (
    <section className="px-4 pt-4 pb-24 text-center">
      <p lang="es" className="mb-6 font-script text-6xl leading-none text-chicha sm:text-7xl">
        ¡Hasta pronto!
      </p>
      <ReserveButton />
    </section>
  );
}
