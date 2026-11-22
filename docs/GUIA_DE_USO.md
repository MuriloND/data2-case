# Guia de Uso — Sistema de Comissões Nuvem Fiscal

> **Objetivo deste documento:** explicar de forma simples e direta como funciona a aplicação de cálculo de comissões, servindo de base para o manual do usuário final (sem termos técnicos).

---

## 1. O que o sistema faz?

O **Sistema de Comissões Nuvem Fiscal** transforma a planilha de vendas do mês (arquivo `.csv`) em valores prontos para pagamento e extratos individuais para cada vendedor, em poucos segundos.

Com ele, o responsável pelo fechamento:
- Sobe a planilha mesmo quando ela vem com datas, valores ou apelidos de vendedores escritos de jeitos diferentes;
- Revisa apenas os casos que têm dúvida na **Fila de Pendências** — **o sistema nunca chuta nenhum valor**;
- Confere quem atingiu a meta mensal e quanto cada vendedor vai receber;
- Envia o extrato limpo pelo WhatsApp ou baixa a planilha conferida para o Excel.

---

## 2. Como as comissões são calculadas

As regras aplicadas automaticamente pelo sistema são:

1. **Meta individual de R$ 120.000,00 por mês:**
   - Só entram na contagem da meta as **Vendas Novas** ativas do vendedor naquele mês (em ordem de data).
   - **Renovações** e **vendas anuladas** não somam para bater os R$ 120.000,00.
2. **Percentuais da Venda Nova (faixa progressiva):**
   - **5%** sobre tudo que o vendedor vender até atingir **R$ 120.000,00** no mês.
   - **8%** apenas sobre o valor que **passar** de R$ 120.000,00 no mês.
   - *Exemplo:* se um vendedor já acumulou R$ 100.000,00 no mês e fecha mais uma venda nova de R$ 50.000,00, os primeiros R$ 20.000,00 (que completam a meta) ganham **5%** (R$ 1.000,00) e os R$ 30.000,00 excedentes ganham **8%** (R$ 2.400,00), somando R$ 3.400,00.
3. **Renovação:**
   - Comissão fixa de **2%**, independente da meta.
4. **Vendas divididas entre mais de um vendedor:**
   - Por padrão, o sistema divide em partes iguais (ex.: 50% / 50% para dois vendedores, 1/3 para cada em três vendedores).
   - A divisão vale tanto para o valor que conta na meta quanto para o cálculo da comissão de cada um.
   - Quando a planilha indicar um percentual diferente ou com dúvida (como `60/40?`), o caso vai para revisão manual.
5. **Cancelamentos e estornos:**
   - **Cancelou no mesmo mês da venda:** a venda é anulada — fica com R$ 0,00 de comissão e não conta para a meta.
   - **Cancelou em um mês seguinte:** o vendedor recebe normalmente no mês da venda e o sistema cria um **estorno negativo** no mês em que o cliente cancelou, descontando exatamente o mesmo valor que havia sido pago lá atrás (inclusive se na origem tiver sido pago a 8%).
6. **Venda Direta (sem vendedor):**
   - Fica registrada no histórico da empresa com comissão igual a **R$ 0,00**.

---

## 3. Passo a passo para fazer o fechamento

### Passo 1 — Enviar a planilha (CSV)

1. Clique no botão azul **Importar CSV** no canto superior direito.
2. Arraste o arquivo `.csv` para a área pontilhada, clique para escolhê-lo no computador ou cole o conteúdo diretamente na caixa de texto.
3. Se já houver dados carregados na tela, escolha uma das duas opções:
   - **Mesclar novo mês:** mantém os meses anteriores e soma o novo arquivo (ideal ao fechar um novo mês mantendo o histórico para conferir estornos e clientes que retornaram).
   - **Substituir base atual:** apaga os dados anteriores da tela e começa uma conferência limpa apenas com o novo arquivo.
4. Clique em **Processar CSV**.

> **Dica:** se você quiser testar o sistema antes de subir sua própria planilha, pode clicar em **Carregar amostra demo** para explorar um conjunto fictício de exemplo.

---

### Passo 2 — Resolver a Fila de Pendências (primeira aba)

Sempre que o sistema encontrar qualquer informação incompleta, escrita com dúvida (`?`), fora do padrão ou suspeita de repetição, ele **não inclui** aquele lançamento na conta final e o envia para a **Fila de Pendências**.

Cada cartão mostra o número da linha na planilha, destaca em vermelho os campos que precisam de atenção, explica em português claro o motivo e oferece botões rápidos (além de sugestões automáticas quando há pista no histórico):

| Tipo de alerta na Fila | O que fazer |
| :--- | :--- |
| **Tipo em branco ou desconhecido** | Clique em **Venda Nova (5% / 8%)** ou **Renovação (2%)**. Se houver sugestão (ex.: cliente que cancelou antes e retornou), ela aparece destacada. |
| **Valor com dúvida (`?`) ou inválido** | Clique no botão de confirmação sugerido ou digite o valor exato em reais e clique em **Aplicar valor**. |
| **Vendedor em branco** | Confirme como **Venda Direta (R$ 0)** ou selecione o(s) vendedor(es) responsável(is). |
| **Vendedor desconhecido** | Escolha um vendedor já cadastrado (com opção de **Lembrar alias** para os próximos arquivos), **crie um novo vendedor** na hora ou marque como **Venda Direta**. |
| **Ex-funcionário(a)** | Escolha se deseja aprovar o pagamento para a conta indicada, reatribuir a outro vendedor, marcar como Venda Direta ou **Descartar lançamento**. |
| **Rateio com dúvida (ex.: `60/40?`)** | Confirme o percentual sugerido, escolha **Igualitário** ou digite as porcentagens desejadas (a soma deve fechar em 100%). |
| **Cancelamento sem mês informado** | Clique na sugestão de **Mesmo mês** ou escolha no calendário o mês real do cancelamento. |
| **Possível duplicata** | Compare com a linha original citada no alerta e clique em **Descartar duplicata** ou **Manter ambas no cálculo**. |
| **Data ou status inválido** | Escolha a data correta no calendário ou defina se o contrato está **Fechado** ou **Cancelado** (informando o mês). |

- **Recálculo imediato:** a cada item resolvido, o valor total a pagar e os cartões no topo da tela são atualizados na hora.
- **Errou uma escolha?** Clique na sub-aba **Resolvidas** ou **Descartadas** dentro da Fila de Pendências e aperte **Desfazer** para devolver a linha para revisão.

---

### Passo 3 — Conferir o Resumo Mensal & Metas (segunda aba)

Nesta aba você acompanha a visão gerencial de todo o time:

- **Tabela Vendedor × Mês:** mostra o valor líquido a pagar para cada vendedor em cada mês e o total consolidado.
  - Um **ponto verde** na célula indica que o vendedor bateu a meta de R$ 120.000,00 naquele mês (entrando na faixa de 8%).
  - Um **ponto vermelho/rosa** indica que houve pelo menos um estorno lançado naquele mês.
  - **Clique em qualquer valor** da tabela para abrir diretamente o extrato detalhado daquele vendedor naquele mês.
- **Cartões de Progresso da Meta:** escolha o mês desejado no seletor para ver a barra de preenchimento dos R$ 120.000,00, quanto já vendeu em Vendas Novas, quanto falta (ou quanto passou na faixa de 8%), além dos totais separados de Novas, Renovações e Estornos.

---

### Passo 4 — Conferir e enviar o Extrato Individual (terceira aba)

Esta aba foi feita para dar transparência total ao vendedor e encerrar dúvidas sobre o valor final:

1. Selecione o **Vendedor** e a **Competência** (um mês específico ou **Todos os meses**). Use o campo de busca para achar rapidamente um cliente ou número de linha.
2. Se ainda houver pendências abertas daquele vendedor na Aba 1, um aviso amarelo aparecerá no topo para que ninguém esqueça nada antes de fechar o pagamento.
3. Na tabela linha por linha, você confere:
   - Data e número da linha original na planilha;
   - Nome do cliente e observação (quando houver);
   - Se a venda foi dividida (mostrando a porcentagem e com quem foi dividida);
   - A **faixa aplicada** (`5%`, `8%`, `5% + 8%` detalhando as duas fatias, `2%`, `Anulada` ou `Estorno` mostrando exatamente de qual mês e linha veio);
   - O valor final da comissão naquela linha.
4. Para enviar ou arquivar o extrato:
   - **Copiar para WhatsApp:** copia um resumo organizado com meta, lançamentos, estornos e total líquido pronto para colar no WhatsApp do vendedor.
   - **Prévia:** permite ler e conferir a mensagem do WhatsApp na tela antes de enviar.
   - **Exportar CSV:** baixa uma planilha já calculada e formatada para abrir sem erros de acentuação no Microsoft Excel.
5. No rodapé desta aba, o bloco recolhível **Vendas Diretas sem vendedor** lista as vendas diretas confirmadas (com comissão R$ 0,00) para conferência histórica.

---

## 4. Salvamento e Restauração dos Dados

- Tudo o que você resolve, importa ou cadastra (novos vendedores e apelidos) fica **salvo automaticamente no seu navegador**. Mesmo que você recarregue a página, suas conferências continuam lá.
- Caso queira recomeçar do zero a qualquer momento, clique no botão **Restaurar Jul–Out** (ou **Limpar base**) no topo da tela.

---

## 5. Perguntas Frequentes (FAQ)

**1. Posso fechar as comissões mesmo com itens ainda na Fila de Pendências?**
Sim, os valores exibidos já consideram tudo o que está 100% confirmado, mas o ideal é zerar a Fila de Pendências antes do pagamento para não deixar nenhuma venda válida de fora.

**2. Se eu subir um mês novo (ex.: Novembro) em modo "Mesclar", ele apaga o que eu já resolvi nos meses anteriores?**
Não. Todas as decisões anteriores são mantidas, e o sistema ainda consegue identificar se uma venda de novembro é duplicata de outubro ou se um cliente antigo voltou depois de cancelar.

**3. Um vendedor mudou de apelido na planilha do mês seguinte (ex.: passaram a escrever "Rafa M."). Preciso arrumar linha por linha?**
Não. Ao mapear o novo apelido na primeira ocorrência e deixar marcada a opção **Lembrar alias**, o sistema reconhece automaticamente todas as outras linhas com aquele nome no arquivo atual e nos próximos uploads.

**4. Por que um estorno aparece negativo em setembro se a venda foi feita em julho?**
Porque o vendedor recebeu a comissão normalmente em julho. Quando o cliente cancela em setembro, o desconto acontece no fechamento de setembro no mesmo valor exato (5%, 8% ou 2%) que havia sido pago em julho.

---

## 6. Checklist Rápido de Fechamento Mensal

1. **Importe** o CSV do mês (**Mesclar novo mês** para manter histórico ou **Substituir base** para conferência isolada).
2. **Zere a Fila de Pendências** revisando tipos em branco, valores com `?`, rateios, cancelamentos e duplicatas.
3. **Confira o Resumo Mensal & Metas** para validar totais a pagar e metas batidas de R$ 120k.
4. **Abra o Extrato Individual** de cada vendedor e clique em **Copiar para WhatsApp** para enviar o demonstrativo transparente.
5. **Exporte o CSV** final para arquivo financeiro ou folha de pagamento.
