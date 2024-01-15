export const calculateVariance = (originalDailyLimit: number, varianceValue: number = 0.5) => {
  return Math.round( varianceValue * originalDailyLimit);
};
