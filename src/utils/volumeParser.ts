export interface PackVolumeResult {
  size: number;
  unit: 'Ltr' | 'ml' | 'Kg' | 'gm';
  totalValue: number;
  totalDisplay: string;
}

/**
 * Extracts pack volume/weight from product name (e.g. 'Urnicon (5 lit)', 'Utrimex (500ml)', 'Milkymex DS (25kg)')
 * and calculates total volume/weight based on total units.
 */
export function parsePackVolume(productName?: string, totalUnits: number = 0): PackVolumeResult | null {
  if (!productName || totalUnits <= 0) return null;

  // Match patterns like (5 lit), 5lit, 5 lit, 5 ltr, 5l, 500ml, 300 ml, 25kg, 10 kg, 1lit, 250ml
  const match = productName.match(/(?:^|[(\s/])(\d+(?:\.\d+)?)\s*(lit(?:re|er)?s?|ltrs?|l\b|ml\b|m\.l\.|kgs?|k\.g\.|kilos?|gms?|grams?)(?:$|[)\s/])/i);
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
