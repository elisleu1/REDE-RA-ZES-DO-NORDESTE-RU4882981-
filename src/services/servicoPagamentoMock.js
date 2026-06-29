// integração com serviço externo de pagamento
export async function processarPagamentoExterno(metodo, valor) {
  console.log(`Chamando serviço externo de pagamento...`);
  
  // simulação de 1 segundo
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Mock: 90% de chance de sucesso
  const sucesso = Math.random() < 0.9;

  if (sucesso) {
    return { status: "APROVADO", codigoTransacao: "TX-" + Date.now() };
  } else {
    throw new Error("Pagamento recusado pelo serviço externo");
  }
}
