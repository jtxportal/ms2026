import { useNavigate } from 'react-router-dom'

const SEKCE = [
  {
    title: 'Proč tato aplikace vznikla',
    icon: '⚽',
    color: '#00b4c8',
    text: `Soukromá tipovačka pro kamarády a fanoušky AFK Kácov.

Nejde o žádnou sázkovou kancelář ani o podnikání. V této soutěži nikdo nic nebere pro sebe a nikdo na provozu nevydělává. Veškeré vložené peníze se rozdělí mezi účastníky podle jejich úspěšnosti při tipování.

Jinými slovy — peníze se pouze přerozdělí od těch, kteří fotbalu rozumí méně, k těm, kterým Pánbůh nadělil lepší fotbalový odhad.`
  },
  {
    title: 'Jak soutěž funguje',
    icon: '🎯',
    color: '#e8a020',
    text: 'Každý registrovaný účastník může tipovat přesné výsledky jednotlivých zápasů — přesně jeden tip na každý zápas. Tipuje se vždy přesný výsledek po základní hrací době. Prodloužení ani penalty se nezapočítávají.'
  },
  {
    title: 'Výše sázek',
    icon: '💰',
    color: '#4ade80',
    items: [
      ['Skupiny', '10 Kč'],
      ['1/32 finále', '20 Kč'],
      ['1/16 finále', '20 Kč'],
      ['Osmifinále', '20 Kč'],
      ['Čtvrtfinále', '20 Kč'],
      ['Semifinále', '50 Kč'],
      ['O 3. místo', '50 Kč'],
      ['Finále', '100 Kč'],
      ['Vítěz MS + nejlepší střelec', '20 Kč / tip'],
    ]
  },
  {
    title: 'Jak vzniká bank zápasu',
    icon: '🏦',
    color: '#e8a020',
    text: 'Všechny sázky na konkrétní zápas vytvoří společný bank. Na zápas vsadí 30 účastníků: 30 × 10 Kč = 300 Kč. Bank zápasu tedy činí 300 Kč.'
  },
  {
    title: 'Jak se vyplácí výhra',
    icon: '🏆',
    color: '#e8a020',
    text: 'Bank zápasu se rozdělí mezi všechny účastníky, kteří trefí přesný výsledek. Příklad: Bank 300 Kč, trefí 3 účastníci → každý dostane 100 Kč. Účastníkům, kteří výsledek netrefili, se odečítá pouze jejich vklad.'
  },
  {
    title: 'Převod nevyhraného banku ze zápasu',
    icon: '🎰',
    color: '#c41230',
    text: 'Pokud žádný účastník netrefí přesný výsledek zápasu, bank se nepřerozděluje. Celá částka se automaticky převádí do dalšího zápasu. Hráči tak budou hrát v příštím nejbližším zápase o vyšší částku.'
  },
  {
    title: 'Úprava tipu',
    icon: '✏️',
    color: '#00b4c8',
    text: 'Každý účastník může svůj tip jednou změnit do okamžiku výkopu zápasu. Lze si dopředu natipovat všechny zápasy a před výkopem máte jednu možnost tip změnit. Po zahájení utkání je tip automaticky uzamčen.'
  },
  {
    title: 'Dlouhodobé tipy',
    icon: '🎯',
    color: '#e8a020',
    text: 'Lze tipnout celkového vítěze MS a nejlepšího střelce. Sázka 20 Kč za každý. Uzávěrka: po odehraném prvním kole základních skupin (cca 17. 6. 2026).'
  },
  {
    title: 'Průběžné výsledky',
    icon: '📊',
    color: '#4ade80',
    items: [
      ['Kolik jste vsadili', ''],
      ['Kolik jste vyhráli', ''],
      ['Aktuální zisk nebo ztrátu', ''],
      ['Pořadí mezi ostatními', ''],
      ['Počet správně tipnutých zápasů', ''],
    ]
  },
  {
    title: 'Nerozdělený bank po finále',
    icon: '🏆',
    color: '#e8a020',
    text: 'Pokud po skončení finálového zápasu zůstane nerozdělený jackpot, rozdělí se mezi tři nejúspěšnější účastníky dlouhodobé soutěže.',
    items: [
      ['1. místo', '50 %'],
      ['2. místo', '33 %'],
      ['3. místo', '17 %'],
    ]
  },
  {
    title: 'Chat a komunikace',
    icon: '💬',
    color: '#00b4c8',
    text: 'Po celou dobu mistrovství je otevřený hlavní chat (záložka nahoře). Pod každým zápasem je vlákno diskuze — otevírá se 48 hodin před výkopem a zavírá se 24 hodin po výkopu. Při rozkliknutí vlákna můžete reagovat.\n\nAdministrátoři Venca Šinďa a Bob mají právo při opakovaném porušení slušného chování účastníka zabanovat nebo vyloučit ze soutěže.'
  },
  {
    title: 'Finanční vyrovnání',
    icon: '⚠️',
    color: '#c41230',
    text: 'Registrací do soutěže účastník potvrzuje, že po skončení mistrovství uhradí svůj případný záporný zůstatek do 3 dnů.\n\nPokud svůj závazek nevyrovná, buď mu bude přestřihnuta registračka, nebo dostane do huby. (Šinďa bude rozhodovat.)\n\nOrganizátoři garantují, že všechny prostředky budou spravedlivě přerozděleny přesně podle výsledků soutěže. Nikdo z organizátorů si z vložených prostředků neodečítá žádnou provizi ani odměnu.'
  },
]

export default function Pravidla() {
  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '40px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>📋</div>
        <h1 style={{ fontWeight: 900, fontSize: '24px', color: '#fff', margin: '0 0 6px' }}>Pravidla soutěže</h1>
        <p style={{ fontSize: '13px', color: '#00b4c8', margin: 0 }}>Tipovačka MS 2026 · AFK Kácov</p>
      </div>

      {/* Motto */}
      <div style={{ background: 'linear-gradient(135deg, rgba(0,180,200,0.1), rgba(232,160,32,0.1))', border: '1px solid rgba(232,160,32,0.3)', borderRadius: '16px', padding: '16px 20px', marginBottom: '20px', textAlign: 'center' }}>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', fontStyle: 'italic', lineHeight: 1.7, margin: 0 }}>
          „Peníze se pouze přerozdělí od těch, kteří fotbalu rozumí méně,<br/>k těm, kterým Pánbůh nadělil lepší fotbalový odhad."
        </p>
      </div>

      {/* Sekce */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {SEKCE.map((s, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '14px', padding: '14px 16px', borderLeft: `3px solid ${s.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '18px' }}>{s.icon}</span>
              <h2 style={{ fontWeight: 700, fontSize: '14px', color: s.color, margin: 0 }}>{s.title}</h2>
            </div>
            {s.text && s.text.split('\n\n').map((para, j) => (
              <p key={j} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, margin: j < s.text.split('\n\n').length - 1 ? '0 0 8px' : 0 }}>{para}</p>
            ))}
            {s.items && (
              <div style={{ marginTop: s.text ? '8px' : 0 }}>
                {s.items.map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '13px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>{k}</span>
                    {v && <strong style={{ color: '#fff' }}>{v}</strong>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Záver */}
      <div style={{ background: 'rgba(0,180,200,0.08)', border: '1px solid rgba(0,180,200,0.2)', borderRadius: '14px', padding: '16px', marginTop: '16px', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: '0 0 10px', fontStyle: 'italic' }}>
          Tato aplikace vznikla z dobré vůle pro zábavu kamarádů.
        </p>
        <p style={{ fontSize: '14px', color: '#e8a020', fontWeight: 700, margin: 0 }}>
          ⚽ Sportu zdar, fotbalu zvlášť a kácovskému obzvlášť!
        </p>
      </div>
    </div>
  )
}
