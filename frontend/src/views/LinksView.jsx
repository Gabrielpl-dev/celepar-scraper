import s from './LinksView.module.css'

const LINKS = [
  { label: 'AGROFIT - MAPA', url: 'http://agrofit.agricultura.gov.br/agrofit_cons/principal_agrofit_cons' },
  { label: 'SIAGRO - PR',    url: 'https://auth-cs.identidadedigital.pr.gov.br/centralautenticacao/login.html?response_type=code&client_id=4c5bde74a8f110656874902f07378009&redirect_uri=https%3A%2F%2Fwww.siagro.adapar.pr.gov.br%2Fsiagro&scope=&state=state&urlCert=https://certauth-cs.identidadedigital.pr.gov.br&dnsCidadao=https://cidadao-cs.identidadedigital.pr.gov.br/centralcidadao&loginPadrao=btnCentral&labelCentral=CPF,E-Mail,Login%20Sentinela&modulosDeAutenticacao=btnSentinela,btnExpresso,btnCertificado,btnSms,btnCpf,btnToken,btnEmail,btnCentral&acesso=2078&tokenFormat=default&exibirLinkAutoCadastro=true&exibirLinkRecuperarSenha=true&exibirLinkAutoCadastroCertificado=false' },
  { label: 'ADAPAR - PR',    url: 'http://celepar07web.pr.gov.br/agrotoxicos/pesquisar.asp' },
  { label: 'SIG@ - RS',      url: 'https://secweb.procergs.com.br/sdae/consultaPublica/SDA-ConsultaPublica-Upload-Pesquisar.jsf' },
  { label: 'SIGEN - SC',     url: 'https://sigen.cidasc.sc.gov.br/consultaagrotoxicocadastropublico/consultaagx' },
  { label: 'CREA - SP',      url: 'https://gedave.defesaagropecuaria.sp.gov.br/gedave/pages/vegetal/consultaPublica/agrotoxico/pesquisa.faces' },
  { label: 'IAGRO - MS',     url: 'http://www.servicos.iagro.ms.gov.br/agrotoxico' },
  { label: 'IMA - MG',       url: 'http://www.ima.mg.gov.br/index.php?preview=1&option=com_dropfiles&format=&task=frontfile.download&catid=1516&id=19344&Itemid=1000000000000' },
  { label: 'SISDEV - MT',    url: 'https://sistemas.indea.mt.gov.br/SISDEV/report_produtos_autorizados_public.action' },
  { label: 'SIAFRO - RO',    url: 'http://www.idaron.ro.gov.br/SIAFRO/XML/AGROTOXICOS.xml' },
  { label: 'IDIARN - RN',    url: 'http://www.adcon.rn.gov.br/ACERVO/idiarn/DOC/DOC000000000168756.PDF' },
  { label: 'IDAF - ES',      url: 'https://app.idaf.es.gov.br/eidaf/consultas-agrotoxicos' },
  { label: 'SIDAGO - GO',    url: 'https://sidago.agrodefesa.go.gov.br/site/adicionaisproprios/agrotoxicos/agrotoxicos.php' },
  { label: 'ADAPEC - TO',    url: 'http://intranet.adapec.to.gov.br/sistemasintranet/relatorio_agrotox/relatorio_agrotox.asp' },
]

export function LinksView() {
  return (
    <section className={s.section}>
      <div className={s.header}>
        <h3 className={s.title}>Links</h3>
        <p className={s.desc}>Sistemas estaduais de agrotóxicos.</p>
      </div>
      <div className={s.grid}>
        {LINKS.map(({ label, url }) => (
          <a key={label} href={url} target="_blank" rel="noopener noreferrer" className={s.btn}>
            {label}
          </a>
        ))}
      </div>
    </section>
  )
}
