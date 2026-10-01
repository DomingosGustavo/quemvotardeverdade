# Votações nominais usadas no cálculo das posições dos parlamentares

Este arquivo documenta `data/rollcalls.json`: as votações nominais da 57ª legislatura (fevereiro de 2023 até hoje) usadas para estimar a posição de cada deputado e senador em cada questão do quiz. Os votos individuais são baixados por `scripts/fetch-votes.mjs` e gravados em `data/raw/votos.json`.

## Como ler

- **SIM = concorda** (`direcao: 1`): votar SIM nessa votação equivale a concordar com a afirmação da questão. **SIM = discorda** (`direcao: -1`): votar SIM equivale a discordar.
- **Peso**: 1 para a votação de mérito (texto-base ou texto final); 0,5 para urgência, requerimento, destaque, 2º turno de PEC (mesmo conteúdo do 1º turno) ou votação de comissão; 0,2–0,3 para votações quase unânimes ou de relação indireta com a afirmação.
- **Vetos** (id `veto-<código>`): são votados em sessão conjunta do Congresso, e cada Casa tem seu placar. Nessas votações, **SIM = manter o veto** e NÃO = derrubar. Os dados abertos (`/dadosabertos/plenario/resultado/veto/dispositivo/<código>`) não trazem o ID do parlamentar, então o script associa cada voto ao cadastro por nome + UF. Na conferência, todos os votos foram associados: 3 senadores por grafia aproximada ("Astr. Marcos Pontes", "Prof. Dorinha Seabra", "Márcio Bitar") e os demais por correspondência exata.
- Todos os ids foram conferidos nas APIs oficiais (Câmara: `dadosabertos.camara.leg.br/api/v2/votacoes/{id}/votos`; Senado: `legis.senado.leg.br/dadosabertos/votacao`), e o número de votos baixados confere com o placar oficial.
- A mesma votação pode valer para mais de uma questão. O licenciamento ambiental, por exemplo, conta em `agro_ambiente` e, com peso menor e sinal invertido, em `prioridade_clima`.

### Impostos sobre os mais ricos (`impostos_ricos`)

> Quem ganha muito deve pagar mais imposto: taxar altas rendas, lucros e dividendos, fundos exclusivos e offshores.

| Casa | Data | Proposição | Votação (id) | Placar | SIM = | Peso | Justificativa |
|---|---|---|---|---|---|---|---|
| Câmara | 2023-10-25 | [PL 4173/2023](https://www.camara.leg.br/propostas-legislativas/2383287) | `2383287-43` | Sim 323 × Não 119 | concorda | 1 | Votar SIM aprovou o projeto que passou a tributar periodicamente fundos exclusivos dos super-ricos e rendimentos de offshores e trusts no exterior; SIM concorda com taxar mais quem ganha muito. |
| Câmara | 2025-10-08 | [MPV 1303/2025](https://www.camara.leg.br/propostas-legislativas/2525180) | `2525180-26` | Sim 251 × Não 193 | discorda | 0.5 | Votar SIM aprovou o requerimento que retirou de pauta (e fez caducar) a MP alternativa ao IOF, que elevava tributos sobre aplicações financeiras, juros sobre capital próprio, bets e fintechs; SIM se opõe a taxar mais rendas do capital (procedimental, peso reduzido). |

### Leis trabalhistas (`clt`)

> As regras da CLT devem ser flexibilizadas, dando mais espaço à negociação direta entre empresa e trabalhador.

| Casa | Data | Proposição | Votação (id) | Placar | SIM = | Peso | Justificativa |
|---|---|---|---|---|---|---|---|
| Câmara | 2023-08-29 | [PL 5228/2019](https://www.camara.leg.br/propostas-legislativas/2285157) | `2320643-8` | Sim 303 × Não 95 | concorda | 0.5 | Votar SIM acelerou o projeto que cria um contrato de primeiro emprego com depósito de FGTS e contribuição patronal reduzidos; SIM concorda em flexibilizar as regras da CLT (urgência). |
| Câmara | 2025-06-10 | [PL 1663/2023](https://www.camara.leg.br/propostas-legislativas/2355104) | `2355104-126` | Sim 318 × Não 116 | concorda | 0.3 | Votar SIM aprovou a emenda que permite ao trabalhador cancelar a contribuição sindical por meio digital, com cancelamento automático se o sindicato não responder; SIM se alinha a reduzir o peso dos sindicatos nas relações de trabalho (relação indireta, peso baixo). |

### Fim da escala 6x1 (`escala_6x1`)

> A jornada máxima de trabalho deve ser reduzida por lei, acabando com a escala 6x1.

| Casa | Data | Proposição | Votação (id) | Placar | SIM = | Peso | Justificativa |
|---|---|---|---|---|---|---|---|
| Câmara | 2026-05-27 | [PEC 221/2019](https://www.camara.leg.br/propostas-legislativas/2233802) | `2233802-424` | Sim 472 × Não 22 | concorda | 0.3 | Votar SIM aprovou a PEC que reduz a jornada para 40 horas semanais com dois dias de descanso, acabando com a escala 6x1; quase unânime (472 × 22), por isso peso baixo. |
| Câmara | 2026-05-27 | [PEC 221/2019](https://www.camara.leg.br/propostas-legislativas/2233802) | `2233802-438` | Sim 461 × Não 19 | concorda | 0.2 | Votar SIM aprovou em 2º turno a PEC do fim da escala 6x1; quase unânime (461 × 19), peso baixo. |

### Licenciamento ambiental (`agro_ambiente`)

> O licenciamento ambiental deve ser simplificado para acelerar obras e a expansão do agronegócio, mesmo com menos exigências de proteção.

| Casa | Data | Proposição | Votação (id) | Placar | SIM = | Peso | Justificativa |
|---|---|---|---|---|---|---|---|
| Senado | 2025-05-21 | [PL 2159/2021](https://www25.senado.leg.br/web/atividade/materias/-/materia/148785) | `6935` | Sim 54 × Não 13 | concorda | 1 | Votar SIM aprovou no Senado a Lei Geral do Licenciamento Ambiental, que amplia o autolicenciamento (LAC) e dispensas de licença; SIM concorda em flexibilizar o licenciamento. |
| Câmara | 2025-07-16 | [PL 2159/2021](https://www.camara.leg.br/propostas-legislativas/257161) | `257161-454` | Sim 267 × Não 116 | concorda | 1 | Votar SIM aprovou as emendas do Senado à Lei Geral do Licenciamento (licença por adesão e compromisso, dispensas e prazos mais curtos), enviando o texto à sanção; SIM concorda em simplificar o licenciamento mesmo com menos exigências. |
| Câmara (sessão do Congresso) | 2025-11-27 | [VET 29/2025 (PL 2159/2021)](https://www.congressonacional.leg.br/materias/vetos/-/veto/detalhe/17570) | `veto-46073` | Sim 167 × Não 295 | discorda | 1 | No veto, SIM = manter o veto de Lula, que barrou a licença autodeclaratória (LAC) para empreendimentos de médio porte e médio potencial poluidor; NÃO = derrubar o veto e liberar a flexibilização. SIM discorda de simplificar o licenciamento. |
| Senado (sessão do Congresso) | 2025-11-27 | [VET 29/2025 (PL 2159/2021)](https://www.congressonacional.leg.br/materias/vetos/-/veto/detalhe/17570) | `veto-46073` | Sim 15 × Não 52 | discorda | 1 | No veto, SIM = manter o veto de Lula, que barrou a licença autodeclaratória (LAC) para empreendimentos de médio porte e médio potencial poluidor; NÃO = derrubar o veto. SIM discorda de simplificar o licenciamento. |

### Floresta e clima (`prioridade_clima`)

> Proteger florestas e combater a mudança climática deve ser prioridade, mesmo que isso reduza o crescimento econômico de algumas regiões.

| Casa | Data | Proposição | Votação (id) | Placar | SIM = | Peso | Justificativa |
|---|---|---|---|---|---|---|---|
| Senado | 2025-05-21 | [PL 2159/2021](https://www25.senado.leg.br/web/atividade/materias/-/materia/148785) | `6935` | Sim 54 × Não 13 | discorda | 0.5 | Votar SIM aprovou a flexibilização do licenciamento ambiental, chamada por ambientalistas de 'PL da devastação'; SIM discorda de priorizar a proteção ambiental. |
| Câmara | 2025-07-16 | [PL 2159/2021](https://www.camara.leg.br/propostas-legislativas/257161) | `257161-454` | Sim 267 × Não 116 | discorda | 0.5 | Votar SIM flexibilizou o licenciamento ambiental para acelerar obras e o agronegócio, priorizando crescimento sobre proteção; SIM discorda de priorizar floresta e clima. |
| Câmara (sessão do Congresso) | 2025-11-27 | [VET 29/2025 (PL 2159/2021)](https://www.congressonacional.leg.br/materias/vetos/-/veto/detalhe/17570) | `veto-46073` | Sim 167 × Não 295 | concorda | 0.5 | No veto, SIM = manter o veto que preservou exigências ambientais no licenciamento; SIM concorda em priorizar a proteção ambiental. |
| Senado (sessão do Congresso) | 2025-11-27 | [VET 29/2025 (PL 2159/2021)](https://www.congressonacional.leg.br/materias/vetos/-/veto/detalhe/17570) | `veto-46073` | Sim 15 × Não 52 | concorda | 0.5 | No veto, SIM = manter o veto que preservou exigências ambientais no licenciamento; SIM concorda em priorizar a proteção ambiental. |
| Câmara | 2026-07-01 | [PL 849/2025](https://www.camara.leg.br/propostas-legislativas/2486315) | `2606189-10` | Sim 279 × Não 162 | discorda | 0.3 | Votar SIM acelerou o projeto que reduz a Área de Proteção Ambiental da Baleia Franca; SIM discorda de priorizar a proteção ambiental (urgência, peso reduzido). |
| Câmara | 2026-07-14 | [PDL 171/2026](https://www.camara.leg.br/propostas-legislativas/2612908) | `2637721-10` | Sim 276 × Não 139 | discorda | 0.3 | Votar SIM acelerou o projeto que derruba o decreto de ampliação de uma unidade de conservação no Pantanal; SIM discorda de priorizar a proteção ambiental (urgência, peso reduzido). |

### Marco temporal (`marco_temporal`)

> Terras indígenas só devem ser demarcadas se estivessem ocupadas pelos povos indígenas em 5 de outubro de 1988 (tese do marco temporal).

| Casa | Data | Proposição | Votação (id) | Placar | SIM = | Peso | Justificativa |
|---|---|---|---|---|---|---|---|
| Câmara | 2023-05-24 | [PL 490/2007](https://www.camara.leg.br/propostas-legislativas/345311) | `2362190-9` | Sim 324 × Não 131 | concorda | 0.5 | Votar SIM aprovou a urgência do projeto que fixa 5/10/1988 como marco para demarcar terras indígenas; SIM apoia a tese do marco temporal (procedimental). |
| Câmara | 2023-05-30 | [PL 490/2007](https://www.camara.leg.br/propostas-legislativas/345311) | `345311-270` | Sim 283 × Não 155 | concorda | 1 | Votar SIM aprovou o texto que só reconhece como terra indígena a área ocupada em 5 de outubro de 1988; SIM concorda com o marco temporal. |
| Senado | 2023-09-27 | [PL 2903/2023](https://www25.senado.leg.br/web/atividade/materias/-/materia/157888) | `6755` | Sim 41 × Não 20 | concorda | 0.5 | Votar SIM aprovou a urgência do projeto do marco temporal no Senado; SIM apoia a tese (procedimental). |
| Senado | 2023-09-27 | [PL 2903/2023](https://www25.senado.leg.br/web/atividade/materias/-/materia/157888) | `6756` | Sim 43 × Não 21 | concorda | 1 | Votar SIM aprovou no Senado a lei do marco temporal das terras indígenas (5/10/1988); SIM concorda com a tese. |
| Câmara (sessão do Congresso) | 2023-12-14 | [VET 30/2023 (PL 2903/2023)](https://www.congressonacional.leg.br/materias/vetos/-/veto/detalhe/15969) | `veto-43470` | Sim 137 × Não 321 | discorda | 1 | No veto, SIM = manter o veto de Lula ao dispositivo segundo o qual a ausência da comunidade em 5/10/1988 descaracteriza a terra indígena; NÃO = derrubar o veto e restabelecer o marco temporal. SIM discorda da tese. |
| Senado (sessão do Congresso) | 2023-12-14 | [VET 30/2023 (PL 2903/2023)](https://www.congressonacional.leg.br/materias/vetos/-/veto/detalhe/15969) | `veto-43470` | Sim 19 × Não 53 | discorda | 1 | No veto, SIM = manter o veto de Lula ao marco temporal; NÃO = derrubar o veto e restabelecer a tese. SIM discorda do marco temporal. |
| Senado | 2025-12-09 | [PEC 48/2023](https://www25.senado.leg.br/web/atividade/materias/-/materia/160148) | `7032` | Sim 52 × Não 14 | concorda | 1 | Votar SIM aprovou a PEC que insere o marco temporal de 5/10/1988 na Constituição; SIM concorda com a tese. |
| Senado | 2025-12-09 | [PEC 48/2023](https://www25.senado.leg.br/web/atividade/materias/-/materia/160148) | `7033` | Sim 52 × Não 15 | concorda | 0.5 | Votar SIM aprovou em 2º turno a PEC do marco temporal (mesmo conteúdo do 1º turno, peso reduzido para não contar em dobro); SIM concorda com a tese. |
| Câmara | 2026-06-17 | [PDL 717/2024](https://www.camara.leg.br/propostas-legislativas/2525254) | `2633410-8` | Sim 273 × Não 160 | concorda | 0.3 | Votar SIM acelerou o projeto que susta o procedimento de demarcação de terras indígenas (Decreto 1.775/1996) e duas homologações em Santa Catarina contestadas com base no marco temporal; SIM se alinha à tese (urgência, relação indireta). |

### Aborto (`aborto`)

> O aborto nas primeiras semanas de gestação deve deixar de ser crime.

| Casa | Data | Proposição | Votação (id) | Placar | SIM = | Peso | Justificativa |
|---|---|---|---|---|---|---|---|
| Câmara | 2025-11-05 | [PDL 3/2025](https://www.camara.leg.br/propostas-legislativas/2482078) | `2482078-57` | Sim 317 × Não 111 | discorda | 0.5 | Votar SIM sustou a resolução do Conanda que orientava o atendimento de crianças e adolescentes vítimas de violência sexual, inclusive o acesso ao aborto já previsto em lei; SIM se opõe a ampliar o acesso ao aborto (não trata diretamente da descriminalização, peso reduzido). |

### Maconha (`drogas`)

> O porte de maconha para uso pessoal não deve ser tratado como crime.

| Casa | Data | Proposição | Votação (id) | Placar | SIM = | Peso | Justificativa |
|---|---|---|---|---|---|---|---|
| Senado | 2024-04-16 | [PEC 45/2023](https://www25.senado.leg.br/web/atividade/materias/-/materia/160011) | `6824` | Sim 53 × Não 9 | discorda | 1 | Votar SIM aprovou a PEC que torna crime na Constituição a posse e o porte de qualquer quantidade de droga, inclusive maconha para uso pessoal; SIM discorda da descriminalização. |
| Senado | 2024-04-16 | [PEC 45/2023](https://www25.senado.leg.br/web/atividade/materias/-/materia/160011) | `6825` | Sim 52 × Não 9 | discorda | 0.5 | Votar SIM aprovou em 2º turno a criminalização constitucional do porte de drogas (mesmo conteúdo, peso reduzido); SIM discorda da descriminalização. |
| Câmara (comissão CCJC) | 2024-06-12 | [PEC 45/2023](https://www.camara.leg.br/propostas-legislativas/2428236) | `2428236-50` | Sim 47 × Não 17 | discorda | 0.5 | Votar SIM aprovou na CCJ o parecer pela admissibilidade da PEC que criminaliza o porte de drogas para uso pessoal; SIM discorda da descriminalização (votação de comissão). |

### Casamento homoafetivo (`casamento_lgbt`)

> O casamento civil entre pessoas do mesmo sexo deve continuar garantido.

| Casa | Data | Proposição | Votação (id) | Placar | SIM = | Peso | Justificativa |
|---|---|---|---|---|---|---|---|
| Câmara (comissão CPASF) | 2023-10-10 | [PL 5167/2009 (apensado ao PL 580/2007)](https://www.camara.leg.br/propostas-legislativas/432967) | `346155-112` | Sim 12 × Não 5 | discorda | 0.5 | Votar SIM aprovou na Comissão de Previdência, Assistência Social, Infância e Família o parecer do dep. Pastor Eurico que proíbe o casamento entre pessoas do mesmo sexo; SIM discorda de manter o casamento homoafetivo (votação de comissão, 17 votantes). |

### Religião e Estado (`religiao_estado`)

> Valores cristãos e da família tradicional devem orientar as leis e a educação pública.

| Casa | Data | Proposição | Votação (id) | Placar | SIM = | Peso | Justificativa |
|---|---|---|---|---|---|---|---|
| Câmara | 2025-10-22 | [PRC 71/2025](https://www.camara.leg.br/propostas-legislativas/2561480) | `2573921-8` | Sim 398 × Não 30 | concorda | 0.3 | Votar SIM acelerou a criação de uma Bancada Cristã com status regimental na Câmara; SIM se alinha a dar peso institucional à religião (relação indireta e votação quase consensual, peso baixo). |

### Cotas (`cotas`)

> Cotas raciais e sociais em universidades e concursos públicos devem ser mantidas.

| Casa | Data | Proposição | Votação (id) | Placar | SIM = | Peso | Justificativa |
|---|---|---|---|---|---|---|---|
| Senado | 2023-10-24 | [PL 5384/2020](https://www25.senado.leg.br/web/atividade/materias/-/materia/159365) | `6761` | Sim 24 × Não 46 | discorda | 0.5 | Votar SIM apoiava votar antes a emenda do PL (Flávio Bolsonaro) que trocava as cotas raciais nas universidades por cotas apenas de renda; SIM discorda de manter as cotas raciais (procedimental). |
| Senado | 2024-05-22 | [PL 1958/2021](https://www25.senado.leg.br/web/atividade/materias/-/materia/148596) | `6835` | Sim 29 × Não 32 | discorda | 0.5 | Votar SIM apoiava votar antes a emenda que substituía as cotas raciais em concursos por cotas apenas de renda; SIM discorda de manter as cotas raciais (procedimental). |
| Câmara | 2024-11-13 | [PL 1958/2021](https://www.camara.leg.br/propostas-legislativas/2439779) | `2462049-9` | Sim 272 × Não 140 | concorda | 0.5 | Votar SIM aprovou a urgência do projeto que renova e amplia (para 30%) as cotas para pretos, pardos, indígenas e quilombolas em concursos federais; SIM apoia manter as cotas (procedimental). |
| Câmara | 2024-11-19 | [PL 1958/2021](https://www.camara.leg.br/propostas-legislativas/2439779) | `2439779-55` | Sim 241 × Não 94 | concorda | 1 | Votar SIM aprovou a renovação e ampliação das cotas raciais em concursos públicos federais; SIM concorda em manter as cotas. |

### Armas (`armas`)

> O acesso do cidadão comum a armas de fogo deve ser facilitado.

| Casa | Data | Proposição | Votação (id) | Placar | SIM = | Peso | Justificativa |
|---|---|---|---|---|---|---|---|
| Câmara | 2023-12-06 | [PDL 3/2023](https://www.camara.leg.br/propostas-legislativas/2345680) | `2357898-11` | Sim 254 × Não 156 | concorda | 0.5 | Votar SIM apoiou a urgência do projeto que susta o Decreto 11.366/2023, que suspendeu registros e limitou a compra de armas e munições; SIM concorda em facilitar o acesso a armas (urgência rejeitada por falta de quórum). |
| Câmara | 2025-06-11 | [PL 2876/2025](https://www.camara.leg.br/propostas-legislativas/264726) | `264726-144` | Sim 273 × Não 153 | discorda | 0.3 | Votar SIM aprovou aumentar a pena para disparo de arma de fogo de uso restrito; a bancada armamentista votou NÃO. SIM se alinha a mais controle de armas (relação indireta com o acesso, peso reduzido). |

### Penas mais duras (`penas_duras`)

> Penas devem ser mais duras, com menos benefícios como a saída temporária de presos ("saidinha").

| Casa | Data | Proposição | Votação (id) | Placar | SIM = | Peso | Justificativa |
|---|---|---|---|---|---|---|---|
| Câmara | 2023-10-31 | [PL 3780/2023](https://www.camara.leg.br/propostas-legislativas/2376169) | `2376169-62` | Sim 269 × Não 87 | concorda | 1 | Votar SIM aprovou o aumento das penas para furto, roubo e receptação; SIM concorda com penas mais duras. |
| Senado | 2024-02-20 | [PL 2253/2022](https://www25.senado.leg.br/web/atividade/materias/-/materia/154451) | `6818` | Sim 62 × Não 2 | concorda | 0.3 | Votar SIM aprovou o fim da saída temporária de presos (salvo para estudo) e o exame criminológico para progressão; quase unânime (62 × 2), por isso peso baixo. |
| Câmara (sessão do Congresso) | 2024-05-28 | [VET 8/2024 (PL 2253/2022)](https://www.congressonacional.leg.br/materias/vetos/-/veto/detalhe/16409) | `veto-44445` | Sim 126 × Não 314 | discorda | 1 | No veto, SIM = manter o veto de Lula, que preservava a saída temporária para visita à família; NÃO = derrubar o veto e acabar com essa saidinha. SIM discorda de reduzir benefícios de presos. |
| Senado (sessão do Congresso) | 2024-05-28 | [VET 8/2024 (PL 2253/2022)](https://www.congressonacional.leg.br/materias/vetos/-/veto/detalhe/16409) | `veto-44445` | Sim 11 × Não 52 | discorda | 1 | No veto, SIM = manter o veto que preservava a saída temporária para visita à família; NÃO = derrubar o veto. SIM discorda de reduzir benefícios de presos. |
| Câmara | 2025-07-02 | [PL 1112/2023](https://www.camara.leg.br/propostas-legislativas/2351284) | `2351284-38` | Sim 334 × Não 65 | concorda | 1 | Votar SIM aprovou exigir o cumprimento de 80% da pena para progressão de regime nesses crimes; SIM concorda com penas mais duras e menos benefícios. |
| Câmara | 2025-11-18 | [PL 5582/2025](https://www.camara.leg.br/propostas-legislativas/2579832) | `2579832-62` | Sim 370 × Não 110 | concorda | 0.5 | Votar SIM aprovou o substitutivo que eleva penas (até 40 anos) e endurece regras para facções criminosas; SIM concorda com penas mais duras. Peso reduzido porque parte do NÃO se deveu a divergências sobre o texto do relator, não ao endurecimento em si. |
| Câmara | 2026-04-28 | [PL 1944/2026](https://www.camara.leg.br/propostas-legislativas/2618047) | `2618104-8` | Sim 330 × Não 104 | concorda | 0.3 | Votar SIM acelerou o projeto que mantém os percentuais mais altos de cumprimento de pena (70% a 85%) para crimes hediondos e facções; SIM concorda com penas mais duras (urgência e contexto político da dosimetria, peso reduzido). |
| Câmara (comissão CCJC) | 2026-06-10 | [PEC 32/2015](https://www.camara.leg.br/propostas-legislativas/1228863) | `1228863-102` | Sim 44 × Não 18 | concorda | 0.5 | Votar SIM aprovou na CCJ a admissibilidade da PEC que reduz a maioridade penal para 16 anos; SIM se alinha a punições mais duras (votação de comissão). |

### Anistia do 8 de janeiro (`anistia_8jan`)

> Os condenados pelos atos de 8 de janeiro de 2023 devem ser anistiados ou ter as penas reduzidas.

| Casa | Data | Proposição | Votação (id) | Placar | SIM = | Peso | Justificativa |
|---|---|---|---|---|---|---|---|
| Câmara | 2025-09-17 | [PL 2162/2023](https://www.camara.leg.br/propostas-legislativas/2358548) | `2562149-7` | Sim 311 × Não 163 | concorda | 0.5 | Votar SIM aprovou a urgência do projeto de anistia aos envolvidos nos atos de 8/1, depois convertido em redução de penas (dosimetria); SIM concorda com anistiar ou reduzir penas (procedimental). |
| Câmara | 2025-12-09 | [PL 2162/2023](https://www.camara.leg.br/propostas-legislativas/2358548) | `2358548-89` | Sim 291 × Não 148 | concorda | 1 | Votar SIM aprovou o substitutivo que reduz as penas dos condenados pelo 8 de janeiro e pela trama golpista; SIM concorda com reduzir as penas. |
| Senado | 2025-12-17 | [PL 2162/2023](https://www25.senado.leg.br/web/atividade/materias/-/materia/172003) | `7041` | Sim 48 × Não 25 | concorda | 1 | Votar SIM aprovou no Senado a redução das penas dos condenados pelos atos de 8 de janeiro; SIM concorda com reduzir as penas. |

### Regulação das redes (`regular_redes`)

> As plataformas digitais devem ser regulamentadas e responsabilizadas por conteúdos ilegais e desinformação.

| Casa | Data | Proposição | Votação (id) | Placar | SIM = | Peso | Justificativa |
|---|---|---|---|---|---|---|---|
| Câmara | 2023-04-25 | [PL 2630/2020](https://www.camara.leg.br/propostas-legislativas/2256735) | `2310837-8` | Sim 238 × Não 192 | concorda | 0.5 | Votar SIM aprovou a urgência do projeto que regula plataformas digitais e as responsabiliza por conteúdos ilegais e desinformação; SIM concorda com a regulação (procedimental). |
| Câmara | 2026-03-18 | [PL 4675/2025](https://www.camara.leg.br/propostas-legislativas/2562481) | `2579791-17` | Sim 276 × Não 186 | concorda | 0.3 | Votar SIM acelerou o projeto que cria obrigações especiais para grandes plataformas digitais sob fiscalização do Cade; SIM apoia regulamentar as plataformas (trata de concorrência, não de conteúdo — peso reduzido). |

### Blindagem de parlamentares (`blindagem`)

> Deputados e senadores só deveriam ser processados criminalmente com autorização do próprio Congresso.

| Casa | Data | Proposição | Votação (id) | Placar | SIM = | Peso | Justificativa |
|---|---|---|---|---|---|---|---|
| Câmara | 2025-05-07 | [SAP 1/2025](https://www.camara.leg.br/propostas-legislativas/2494565) | `2494565-52` | Sim 315 × Não 143 | concorda | 0.5 | Votar SIM aprovou usar o poder do Congresso para suspender a ação penal no STF contra um deputado (caso da trama golpista); SIM se alinha a submeter processos de parlamentares ao aval do Congresso. |
| Câmara | 2025-09-16 | [PEC 3/2021](https://www.camara.leg.br/propostas-legislativas/2270800) | `2270800-135` | Sim 353 × Não 134 | concorda | 1 | Votar SIM aprovou a PEC que exige autorização da Câmara ou do Senado para que parlamentares sejam processados criminalmente no STF; SIM concorda com a afirmação. |
| Câmara | 2025-09-16 | [PEC 3/2021](https://www.camara.leg.br/propostas-legislativas/2270800) | `2270800-160` | Sim 344 × Não 133 | concorda | 0.5 | Votar SIM aprovou em 2º turno a PEC da Blindagem (mesmo conteúdo do 1º turno, peso reduzido); SIM concorda com exigir autorização do Congresso para processar parlamentares. |
| Câmara | 2025-09-17 | [PEC 3/2021](https://www.camara.leg.br/propostas-legislativas/2270800) | `2270800-175` | Sim 314 × Não 168 | concorda | 0.5 | Votar SIM aprovou a emenda aglutinativa que restabeleceu o voto secreto na decisão sobre autorizar processo criminal contra parlamentar; SIM reforça a blindagem. |
| Câmara | 2025-10-15 | [SAP 2/2025](https://www.camara.leg.br/propostas-legislativas/2564763) | `2564763-24` | Sim 268 × Não 167 | concorda | 0.5 | Votar SIM aprovou suspender a ação penal no STF contra um deputado; SIM se alinha a submeter processos de parlamentares ao aval do Congresso. |

### Emendas parlamentares (`emendas`)

> O valor das emendas parlamentares deve ser reduzido e sua execução submetida a regras de transparência mais rígidas.

| Casa | Data | Proposição | Votação (id) | Placar | SIM = | Peso | Justificativa |
|---|---|---|---|---|---|---|---|
| Câmara | 2024-11-05 | [PLP 175/2024](https://www.camara.leg.br/propostas-legislativas/2466104) | `2466104-52` | Sim 25 × Não 348 | concorda | 0.3 | Votar SIM apoiava a emenda (PSOL) que limitava emendas de comissão a R$ 3,45 bi em 2025 e corrigia todas as emendas só pela inflação; SIM concorda em reduzir as emendas (rejeitada por 348 × 25, peso baixo). |
| Senado | 2024-11-18 | [PLP 175/2024](https://www25.senado.leg.br/web/atividade/materias/-/materia/166053) | `6879` | Sim 14 × Não 47 | concorda | 0.3 | Votar SIM mantinha no texto a permissão para o governo bloquear emendas parlamentares para acomodar despesas obrigatórias; SIM se alinha a conter as emendas (o PL destacou e derrubou o trecho; peso baixo). |

## Questões sem votação nominal utilizável

| Questão | Motivo |
|---|---|
| `privatizacoes` | Nenhuma votação nominal sobre privatizar estatais (Correios, Petrobras etc.) nesta legislatura. O governo Lula não enviou propostas de privatização, e as votações sobre os Correios (PL 2721/2023) tratam de contratação de serviços postais, não de venda da empresa. |
| `corte_gastos` | Há votações nominais do arcabouço fiscal (PLP 93/2023) e do pacote de corte de gastos de dez/2024 (PLP 210/2024, PL 4614/2024, PEC 45/54/2024), mas o sentido do voto é ambíguo. O arcabouço substituiu o teto por uma regra mais flexível. No pacote, o PL (oposição) votou NÃO junto com o PSOL, por motivos opostos (desgaste do governo × defesa do BPC), então o NÃO não indica a posição sobre cortar gastos. Ficou de fora. |
| `programas_sociais` | O voto da MP do Bolsa Família (MPV 1164/2023) que teve votação nominal tratou de crédito consignado. O PL 4614/2024 (regras mais restritivas para BPC e Bolsa Família) tem o mesmo problema do pacote fiscal: oposição e PSOL votaram NÃO por razões opostas. |

## Questões com cobertura fraca (usar com cautela)

- `aborto`: não houve votação nominal sobre descriminalizar. A urgência do PL 1904/2024 (aborto equiparado a homicídio) foi aprovada em votação simbólica (`2437755-9`, sem votos individuais). Usamos apenas o PDL 3/2025 (Conanda), que trata do acesso ao aborto **já legal** para crianças vítimas de estupro, com peso 0,5.
- `casamento_lgbt`: a única votação nominal é a da Comissão de Família (CPASF), com 17 votantes. Não houve votação em plenário.
- `escala_6x1`: a PEC 221/2019 passou na Câmara de forma quase unânime (472 × 22). Ela só separa um pequeno grupo, principalmente o NOVO e parte do PL. No Senado, a PEC passou apenas na CCJ (em 02/09/2026) e ainda não foi votada em plenário.
- `religiao_estado`, `emendas`, `clt`: poucos votos, de relação indireta e peso baixo (0,3–0,5).
- `regular_redes`: só urgências na Câmara. O mérito do PL 2630/2020 nunca foi votado, e o ECA Digital (PL 2628/2022) foi aprovado em votação simbólica.
- `impostos_ricos`: a reforma do IR (PL 1087/2025, isenção até R$ 5 mil + imposto mínimo sobre altas rendas) foi aprovada na Câmara por 493 × 0 (`2487436-169`), sem informação útil, e no Senado em votação simbólica. Ficamos com os fundos exclusivos/offshores (PL 4173/2023) e a derrubada da MP 1303/2025.

## Votações investigadas e descartadas

- **PL 3874/2023** (`2421056-8`, urgência, 302 × 82): proíbe posse e porte de arma a agressores de mulheres. Removida na revisão: é uma restrição consensual a pessoas com histórico de violência e não mede a posição sobre o acesso do *cidadão comum sem antecedentes*, que é o que a pergunta afirma. Votos pró-armas e antiarmas se misturam no SIM.

- **PL 2253/2022 (saidinha) na Câmara, mar/2024**: votação simbólica (`493361-84` sem votos individuais). A posição dos deputados vem da derrubada do veto (VET 8/2024).
- **PL 2253/2022, Emenda 8 no Senado** (`6819`, 27 × 37): a emenda do PT não mantinha a saidinha para visita à família, como se supunha. Ela mudava o rol de crimes excluídos. O sentido ficou ambíguo e a votação foi descartada.
- **Lei de Cotas (PL 5384/2020) na Câmara, ago/2023**: votação simbólica. No Senado, só o requerimento de preferência (`6761`) foi nominal.
- **PEC 3/2021 (Blindagem) no Senado**: rejeitada por unanimidade na CCJ (26 × 0, 24/09/2025), sem informação útil. Na Câmara também foi descartada a votação `2270800-165` (destaque sobre o voto secreto, redundante com `2270800-175`).
- **Veto à Dosimetria (VET 3/2026, derrubado em 30/04/2026)**: veto total votado no painel, mas os dados abertos só publicam o resultado em PDF (`pdfResultadoNominalDestaque/17969`), sem lista estruturada de votos. Não foi incluído.
- **PL 1087/2025**: além do 493 × 0 no plenário, houve um destaque na comissão especial (25 × 5) cujo conteúdo não foi possível identificar com segurança. Descartado.
- **PL 2159/2021 no plenário da Câmara em 2021** e **PL 1459/2022 (agrotóxicos) na Câmara em 2022**: anteriores à 57ª legislatura. O PL 1459 passou no Senado em votação simbólica (nov/2023).
- **PL 1904/2024 (aborto)**: a urgência foi simbólica e não houve votação de mérito.
- **MPV 1150/2022 (Mata Atlântica)** (`2345368-78`, 66 × 364): o PT foi liberado e votou majoritariamente com o relator. O voto não separa bem quem prioriza a proteção ambiental e foi descartado.
- **PL 4497/2024 (títulos em faixa de fronteira), MPV 1308/2025 (licença especial), PLP 175/2024 (mérito)**: o sentido do voto é ambíguo em relação às afirmações, ou não foi possível identificar o conteúdo do destaque.
- **PL 5582/2025 no Senado** (64 × 0) e **PEC 18/2025 (segurança pública)** (487 × 15): quase unânimes.
- **CMC 1/2024 (prisão de Chiquinho Brazão)**: trata de prisão, não de autorização para processo. Fora de `blindagem`.

## Ressalvas

- Votações de urgência e requerimentos (peso 0,5) refletem também a disciplina partidária e acordos de pauta, não só o mérito.
- Nos vetos, o painel registra quem votou. Parlamentares ausentes não aparecem em `votos.json`. No Senado, os códigos de ausência (AP, LS, MIS, NCom etc.) são descartados, e "P-NRV" (presente sem voto) e "Presidente" viram `outro`.
- A votação `2618104-8` (PL 1944/2026) é a urgência de um projeto que restabelece regras mais duras de progressão de regime. Ela se insere na disputa sobre a derrubada do veto à Dosimetria, por isso tem peso 0,3.
