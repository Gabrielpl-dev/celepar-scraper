import s from './Sidebar.module.css'

const OPS = [
  { id: 'extrair',   num: '01', label: 'Extrair por cultura' },
  { id: 'siagro',    num: '02', label: 'Buscar por SIAGRO' },
  { id: 'comparar',  num: '03', label: 'Comparar culturas' },
  { id: 'verificar', num: '04', label: 'Verificar produto' },
  { id: 'raw',       num: '--', label: 'Listagem bruta' },
]

export function Sidebar({ activeView, setActiveView, params, setParams }) {
  return (
    <aside className={s.aside}>
      <h2 className={s.sectionTitle}>Operações</h2>
      <div className={s.ops}>
        {OPS.map(op => (
          <button
            key={op.id}
            className={`${s.op} ${activeView === op.id ? s.opActive : ''}`}
            onClick={() => setActiveView(op.id)}
          >
            <span className={s.num}>{op.num}</span>
            {op.label}
          </button>
        ))}
      </div>

      <div className={s.params}>
        <h2 className={s.sectionTitle}>Parâmetros da URL</h2>
        <div className={s.field}>
          <label htmlFor="paramCod">Cod</label>
          <input
            id="paramCod"
            type="text"
            value={params.Cod}
            placeholder="ex: 2968"
            onChange={e => setParams(p => ({ ...p, Cod: e.target.value }))}
          />
        </div>
        <div className={s.field}>
          <label htmlFor="paramDesc">descIngrediente</label>
          <input
            id="paramDesc"
            type="text"
            value={params.descIngrediente}
            placeholder="(opcional)"
            onChange={e => setParams(p => ({ ...p, descIngrediente: e.target.value }))}
          />
        </div>
        <p className={s.hint}>
          Os demais campos vão como <code className={s.hintCode}>null</code>/vazio igual à URL original.
        </p>
      </div>
    </aside>
  )
}
