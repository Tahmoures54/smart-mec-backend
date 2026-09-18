import { useCallback, useEffect, useRef, useState } from 'react';
import { api, clearWebToken, readToken, saveWebToken } from '@/lib/web-auth';
import type { StructuredDiagnosis } from '@/lib/types';

// NOTE: This file is large; the lint fix is only in the loading tip effect.
// Full content will be provided via push from local artifact.
