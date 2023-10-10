export const checkEnvVariables = (params: string[]) => {
  for (const variable of params) {
    if (!process.env[variable]) {
      return false;
    }
  }
  return true;
};
