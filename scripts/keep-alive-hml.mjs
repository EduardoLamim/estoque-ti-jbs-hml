import { checkHmlHealth } from './hml-health.mjs';
try {
  console.log(await checkHmlHealth(process.env));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
