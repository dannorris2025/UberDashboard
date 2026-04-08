import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const excelPath = 'C:/Users/Daniel/Downloads/BASE UBER LAMSA.xlsx';
const outputPath = './public/dados_uber.json';

try {
    console.log(`Lendo arquivo: ${excelPath}`);
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Convertendo ${data.length} registros...`);
    
    // Mapeamento e Normalização de chaves
    const mappedData = data.map(row => {
        const getVal = (keys) => {
            for (const key of keys) {
                if (row[key] !== undefined) return row[key];
            }
            return undefined;
        };

        return {
            date: getVal(['DATA DA SOLICITAÇÃO', 'Date', 'date', 'Data', 'data']),
            time: getVal(['HORA DA SOLICITAÇÃO', 'Time', 'time', 'Hora', 'hora']),
            driver: getVal(['NOME COMPLETO', 'Driver', 'driver', 'Motorista', 'motorista', 'NOME']),
            value: getVal(['VALOR TOTAL', 'VALOR COM TRIBUTO', 'VALOR SEM TRIBUTO', 'Value', 'value', 'Valor', 'valor']),
            km: getVal(['DISTÂNCIA', 'Distance', 'distance', 'KM', 'Km', 'km']),
            service: getVal(['SERVIÇO', 'Service', 'service', 'Serviço', 'servico']),
            costCenter: getVal(['CENTRO DE CUSTO', 'Cost Center', 'costCenter', 'centro_custo', 'CÓDICO DA DESPESA']),
            origin: getVal(['ENDEREÇO DE PARTIDA', 'Origin', 'origin', 'Origem', 'origem']),
            destination: getVal(['ENDEREÇO DE DESTINO', 'Destination', 'destination', 'Destino', 'destino']),
            area: getVal(['ÁREA', 'AREA', 'Área', 'Area']),
            subArea: getVal(['SUB ÁREA', 'SUB AREA', 'Sub Área', 'Sub Area'])
        };
    });

    // Escreve o JSON formatado
    fs.writeFileSync(outputPath, JSON.stringify(mappedData, null, 2));
    
    console.log(`Sucesso! Arquivo salvo em: ${outputPath}`);
} catch (error) {
    console.error('Erro ao processar o Excel:', error);
    process.exit(1);
}
