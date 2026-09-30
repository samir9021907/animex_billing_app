export interface PackVolumeResult {
  size: number;
  unit: 'Ltr' | 'ml' | 'Kg' | 'gm';
  totalValue: number;
  totalDisplay: string;
}

/**
 * Extracts pack volume/weight from product name and/or unit
 * (e.g. 'Animex Liv 1lit', 'Urnicon (5 lit)', 'Utrimex (500ml)', 'Rumen mex (300ml)', 'Milkymex DS (25kg)')
 * and calculates total volume/weight based on total units.
 */
export function parsePackVolume(
  productName?: string,
  totalUnits: number = 0,
  unitStr?: string
): PackVolumeResult | null {
  const combined = `${productName || ''} ${unitStr || ''}`.trim();
  if (!combined || totalUnits <= 0) return null;

  // Match patterns like (5 lit), 5lit, 5 lit, 5 ltr, 5l, 550ml, 300 ml, 25kg, 10 kg, 1lit, 250gm, 300 gm
  const match = combined.match(/(?:^|[(\s/])(\d+(?:\.\d+)?)\s*(lit(?:re|er)?s?|ltrs?|l\b|ml\b|m\.l\.|kgs?|k\.g\.|kilos?|gms?|grams?|g\b)(?:$|[)\s/])/i);
  if (!match) return null;

  const num = parseFloat(match[1]);
  if (isNaN(num) || num <= 0) return null;

  const rawUnit = match[2].toLowerCase();

  if (rawUnit.startsWith('lit') || rawUnit.startsWith('ltr') || rawUnit === 'l') {
    const totalLitres = totalUnits * num;
    const formatted = Number.isInteger(totalLitres) ? totalLitres : Number(totalLitres.toFixed(2));
    return {
      size: num,
      unit: 'Ltr',
      totalValue: totalLitres,
      totalDisplay: `${formatted.toLocaleString('en-IN')} Ltr`,
    };
  } else if (rawUnit.startsWith('m')) {
    const totalMl = totalUnits * num;
    if (totalMl >= 1000) {
      const totalLitres = totalMl / 1000;
      const formatted = Number.isInteger(totalLitres) ? totalLitres : Number(totalLitres.toFixed(2));
      return {
        size: num,
        unit: 'ml',
        totalValue: totalLitres,
        totalDisplay: `${formatted.toLocaleString('en-IN')} Ltr`,
      };
    } else {
      return {
        size: num,
        unit: 'ml',
        totalValue: totalMl,
        totalDisplay: `${totalMl.toLocaleString('en-IN')} ml`,
      };
    }
  } else if (rawUnit.startsWith('k')) {
    const totalKg = totalUnits * num;
    const formatted = Number.isInteger(totalKg) ? totalKg : Number(totalKg.toFixed(2));
    return {
      size: num,
      unit: 'Kg',
      totalValue: totalKg,
      totalDisplay: `${formatted.toLocaleString('en-IN')} Kg`,
    };
  } else if (rawUnit.startsWith('g')) {
    const totalGm = totalUnits * num;
    if (totalGm >= 1000) {
      const totalKg = totalGm / 1000;
      const formatted = Number.isInteger(totalKg) ? totalKg : Number(totalKg.toFixed(2));
      return {
        size: num,
        unit: 'Kg',
        totalValue: totalKg,
        totalDisplay: `${formatted.toLocaleString('en-IN')} Kg`,
      };
    } else {
      return {
        size: num,
        unit: 'gm',
        totalValue: totalGm,
        totalDisplay: `${totalGm.toLocaleString('en-IN')} gm`,
      };
    }
  }

  return null;
}

export interface DetailedStockResult {
  boxes: number;
  loose: number;
  boxTotal: number;
  pieceName: string;
  boxBreakdown: string;
  piecesSummary: string;
  volumeSummary: string;
  fullOneLiner: string;
}

/**
 * Formats stock details into user-desired math breakdown:
 * e.g.: "20 खोके (20 × 50 = 1,000) + 3 सुटे = 1,003 बाटल्या • एकूण 1,003 Ltr"
 * or for 5L: "20 खोके (20 × 4 = 80) + 2 सुटे = 82 Can • एकूण 410 Ltr"
 */
export function formatDetailedStockText(
  stock: number = 0,
  capacity: number = 50,
  unit: string = 'Ltr',
  productName: string = '',
  lang: string = 'mr'
): DetailedStockResult {
  const isMr = lang === 'mr';
  const isHi = lang === 'hi';

  const vol = parsePackVolume(productName, stock, unit);
  const boxes = capacity > 1 ? Math.floor(stock / capacity) : 0;
  const loose = capacity > 1 ? stock % capacity : stock;
  const boxTotal = boxes * capacity;

  const boxWord = isMr ? 'खोके' : isHi ? 'बॉक्स' : boxes === 1 ? 'Box' : 'Boxes';
  const looseWord = isMr ? 'सुटे' : isHi ? 'खुले' : 'Loose';
  const totalWord = isMr ? 'एकूण' : isHi ? 'कुल' : 'Total';

  let pieceName = unit;
  const lowerUnit = (unit || '').toLowerCase();
  const lowerName = (productName || '').toLowerCase();

  if (lowerUnit.includes('can') || lowerName.includes('can') || lowerName.includes('5 lit') || lowerName.includes('5lit')) {
    pieceName = 'Can';
  } else if (lowerUnit.includes('bucket') || lowerName.includes('bucket') || lowerName.includes('25kg') || lowerName.includes('10kg')) {
    pieceName = 'Bucket';
  } else if (lowerUnit.includes('gm') || lowerName.includes('gm') || lowerUnit.includes('pouch') || lowerUnit.includes('pude') || lowerName.includes('powder') || lowerUnit.includes('powder')) {
    pieceName = isMr ? 'पुडे' : isHi ? 'पुड़े/पैकेट' : 'Pouches';
  } else if (lowerUnit.includes('bottle') || lowerName.includes('bottle') || lowerName.includes('ml') || lowerName.includes('1lit') || lowerName.includes('1 lit') || lowerName.includes('gel')) {
    pieceName = isMr ? 'बाटल्या' : isHi ? 'बोतलें' : 'Bottles';
  } else if (lowerUnit.includes('pack') || lowerName.includes('bolus')) {
    pieceName = 'Pack';
  } else if (lowerUnit.includes('box')) {
    pieceName = 'Box';
  } else {
    pieceName = isMr ? 'नग' : isHi ? 'नग' : 'Units';
  }

  // Loose packaging (e.g. 25kg bucket)
  if (capacity <= 1) {
    const volStr = vol ? ` • ${totalWord} ${vol.totalDisplay}` : '';
    const text = `${stock.toLocaleString('en-IN')} ${unit}${volStr}`;
    return {
      boxes: 0,
      loose: stock,
      boxTotal: 0,
      pieceName,
      boxBreakdown: `${stock} ${unit}`,
      piecesSummary: `${stock.toLocaleString('en-IN')} ${unit}`,
      volumeSummary: vol ? vol.totalDisplay : `${stock} ${unit}`,
      fullOneLiner: text,
    };
  }

  // Box packaging
  let boxBreakdown = '';
  if (boxes > 0 && loose > 0) {
    boxBreakdown = `${boxes} ${boxWord} (${boxes} × ${capacity} = ${boxTotal.toLocaleString('en-IN')}) + ${loose} ${looseWord}`;
  } else if (boxes > 0) {
    boxBreakdown = `${boxes} ${boxWord} (${boxes} × ${capacity} = ${boxTotal.toLocaleString('en-IN')})`;
  } else {
    boxBreakdown = `${loose} ${looseWord} ${pieceName}`;
  }

  const piecesSummary = `${stock.toLocaleString('en-IN')} ${pieceName}`;
  const volumeSummary = vol ? `${totalWord} ${vol.totalDisplay}` : '';
  const fullOneLiner = `${boxBreakdown} = ${piecesSummary}${volumeSummary ? ` • ${volumeSummary}` : ''}`;

  return {
    boxes,
    loose,
    boxTotal,
    pieceName,
    boxBreakdown,
    piecesSummary,
    volumeSummary,
    fullOneLiner,
  };
}
