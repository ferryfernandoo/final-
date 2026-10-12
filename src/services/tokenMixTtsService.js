/**
 * Redirect / Backward Compatibility shim
 * All TTS requests are redirected to deepernovaTtsService.
 */
import { deepernovaTtsService } from './deepernovaTtsService.js';

export { deepernovaTtsService };
export const tokenMixTtsService = deepernovaTtsService;
export default deepernovaTtsService;
