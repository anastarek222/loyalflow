// растrear лимит
export const rateLimit = () => {
  return {
    limit: 100,
    windowMs: 60 * 1000,
  };
};