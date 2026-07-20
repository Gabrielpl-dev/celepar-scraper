// fonte única da navegação: dropdowns do Header e FavoritesRadial leem daqui
export const NAV_GROUPS = [
  {
    id: 'cadastro',
    label: 'Cadastro',
    items: [
      { id: 'bula', label: 'Bula', code: 'BULA' },
      { id: 'fe',   label: 'FE',   code: 'FE'   },
    ],
  },
  {
    id: 'revisao',
    label: 'Revisão',
    items: [
      { id: 'culturas',  label: 'Culturas',         code: 'CULT' },
      { id: 'extrair',   label: 'CCCB', title: 'Comparar Cultura Celepar com o Banco', code: 'CCCB' },
      { id: 'siagro',    label: 'Buscar por SIAGRO', code: 'SIAG' },
      { id: 'comparar',  label: 'Comparar culturas', code: 'CMP'  },
      { id: 'verificar', label: 'Verificar produto', code: 'VER'  },
    ],
  },
]

export const ALL_ITEMS = NAV_GROUPS.flatMap(g => g.items)
