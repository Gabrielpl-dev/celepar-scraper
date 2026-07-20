import s from './BulaView.module.css'

export function FeView() {
  return (
    <section className={s.section}>
      <div className={s.header}>
        <h3 className={s.title}>Ficha de Emergência</h3>
        <p className={s.desc}>
          Em construção — vai buscar a FE direto do SIGEN (<code>/api/sigen</code>),
          o backend já expõe o documento.
        </p>
      </div>
    </section>
  )
}
