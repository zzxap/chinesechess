import type {FC} from 'react';
import type {WebsiteDialogProps} from '../websiteLinks';

// Windows uses Linking in the header; keep the native WebView out of its bundle.
export const WebsiteDialog: FC<WebsiteDialogProps> = () => null;
