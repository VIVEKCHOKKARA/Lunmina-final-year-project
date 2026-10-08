/**
 * Performs a simple linear regression on a series of values.
 * @param values The historical data points (e.g., monthly revenue)
 * @returns { slope: number, intercept: number, r2: number }
 */
export function performLinearRegression(values: number[]) {
    const n = values.length;
    if (n < 2) {
        return { slope: 0, intercept: values[0] || 0, r2: 0 };
    }

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    for (let i = 0; i < n; i++) {
        const x = i;
        const y = values[i];
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
        sumY2 += y * y;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared (coefficient of determination)
    const yMean = sumY / n;
    let ssRes = 0;
    let ssTot = 0;

    for (let i = 0; i < n; i++) {
        const x = i;
        const y = values[i];
        const yPred = slope * x + intercept;
        ssRes += Math.pow(y - yPred, 2);
        ssTot += Math.pow(y - yMean, 2);
    }

    const r2 = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);

    return { slope, intercept, r2 };
}

/**
 * Predicts future values based on linear regression parameters.
 * @param slope 
 * @param intercept 
 * @param startIndex The index to start predicting from (e.g., n)
 * @param count How many future periods to predict
 */
export function predictFuture(slope: number, intercept: number, startIndex: number, count: number) {
    const predictions = [];
    for (let i = 0; i < count; i++) {
        const x = startIndex + i;
        const prediction = Math.max(0, Math.round(slope * x + intercept));
        predictions.push(prediction);
    }
    return predictions;
}
