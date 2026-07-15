import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  loading: boolean;
  disabled?: boolean;
  showSuggestions?: boolean;
  mobile?: boolean;
}

// Custom Kracked icon component
const KrackedIcon = ({ className }: { className?: string }) => (
  <svg width="12" height="12" viewBox="0 0 72 126" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M69.0696 15.85V12L62.3696 15.87V19.72C62.3696 20.42 62.3596 21.09 62.3296 21.71C62.2996 22.34 62.2597 22.99 62.1997 23.66L43.2297 34.61L41.8596 35.4L29.0195 42.82C28.9595 42.21 28.9196 41.61 28.8896 41.02C28.8596 40.42 28.8496 39.77 28.8496 39.07V35.22L22.1396 39.09V42.94C22.1396 44.81 22.2096 46.56 22.3596 48.2C22.4596 49.42 22.5996 50.58 22.7896 51.67C23.5396 56.11 24.9498 59.49 27.0098 61.82C27.9498 62.88 28.9896 63.88 30.1296 64.84C30.5896 65.22 31.0596 65.59 31.5596 65.96C32.4496 66.62 33.3896 67.25 34.3896 67.85C36.2096 68.96 38.2197 69.96 40.4097 70.86C40.0297 71.46 39.6496 72.06 39.2896 72.65C37.8896 74.87 36.5696 77.05 35.3396 79.17C33.0896 83.05 31.0896 86.76 29.3596 90.32C28.5096 92.05 27.7298 93.73 27.0098 95.38C23.7598 102.8 22.1396 110.96 22.1396 119.87V123.72L28.8496 119.85V116C28.8496 115.29 28.8596 114.63 28.8896 114C28.9196 113.38 28.9595 112.73 29.0195 112.06L55.2297 96.92L62.1997 92.9C62.2597 93.51 62.2996 94.11 62.3296 94.7C62.3596 95.29 62.3696 95.94 62.3696 96.65V100.49L69.0696 96.62V92.78C69.0696 83.86 67.4497 77.57 64.2097 73.9C60.9697 70.22 56.4996 67.21 50.8096 64.86C56.4996 55.93 60.9697 47.75 64.2097 40.34C67.4497 32.92 69.0696 24.76 69.0696 15.85Z" stroke="#229EFF" strokeLinejoin="round"/>
    <path d="M57.5098 80.22C58.2398 81.02 58.8597 81.89 59.3997 82.83C59.9297 83.78 60.4096 84.83 60.8596 85.98L48.0896 93.35L30.3596 103.59C30.7996 101.86 31.2896 100.23 31.8196 98.7C32.3496 97.18 32.9797 95.6 33.7097 93.96L42.3696 88.96L49.0696 85.09L53.7197 82.41L57.5098 80.22Z" stroke="#229EFF" strokeLinejoin="round"/>
    <path d="M51.8896 75.77L48.8496 77.53L46.5796 78.84L39.3196 83.03C40.2696 81.39 41.2796 79.72 42.3396 78.01C42.5396 77.68 42.7497 77.36 42.9597 77.03C43.8197 75.65 44.6996 74.26 45.6096 72.86C46.5696 73.24 47.5097 73.63 48.4197 74.04C48.5797 74.1 48.7296 74.17 48.8796 74.24C49.9396 74.72 50.9396 75.23 51.8896 75.77Z" stroke="#229EFF" strokeLinejoin="round"/>
    <path d="M48.8796 57.7C47.8196 59.4 46.7296 61.12 45.6096 62.86C44.4896 62.41 43.3996 61.95 42.3396 61.47C41.9096 61.28 41.4996 61.09 41.0896 60.89C40.4796 60.59 39.8896 60.27 39.3196 59.95L39.6597 59.75L51.8896 52.69C50.9396 54.33 49.9396 56 48.8796 57.7Z" stroke="#229EFF" strokeLinejoin="round"/>
    <path d="M59.3997 37.01C58.8597 38.54 58.2398 40.12 57.5098 41.75L33.7097 55.5C33.0297 54.75 32.4397 53.95 31.9297 53.07C31.8897 53.01 31.8596 52.94 31.8196 52.88C31.2896 51.94 30.7996 50.89 30.3596 49.74L35.8796 46.55L50.3796 38.18L60.8596 32.13C60.4096 33.86 59.9297 35.49 59.3997 37.01Z" stroke="#229EFF" strokeLinejoin="round"/>
  </svg>
);

// Initial state icon (idle/empty input) - isometric cube design
const IdleSendIcon = ({ className }: { className?: string }) => (
  <svg width="20" height="20" viewBox="0 0 94 104" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M25.96 79.9155C23.7 77.4855 21.56 74.8256 19.54 71.9256L14.68 74.8956C17.34 78.8856 20.2201 82.5256 23.3101 85.8056C26.4101 89.0856 29.6601 91.9155 33.0801 94.2855V86.3155C30.5901 84.4855 28.22 82.3455 25.96 79.9155ZM11.03 54.1155C10.1 50.9655 9.47 47.8555 9.12 44.7955L2 40.6855C2.35 44.8055 3.19002 49.0456 4.52002 53.3956C5.85002 57.7556 7.62001 62.0556 9.82001 66.3156L14.68 63.5455C13.17 60.4155 11.96 57.2755 11.03 54.1155Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M58.7699 38.6057L53.9099 41.5757C53.7199 41.3057 53.5298 41.0357 53.3398 40.7757C53.2298 40.6157 53.1199 40.4657 52.9999 40.3057C51.2399 37.8857 49.3699 35.6357 47.3999 33.5357C47.1399 33.2557 46.8699 32.9757 46.5999 32.7057C46.4499 32.5457 46.2899 32.3857 46.1299 32.2257C44.2099 30.2957 42.2299 28.5857 40.1899 27.0857V19.1157C40.3199 19.2057 40.4598 19.3057 40.5898 19.4057C43.8698 21.7057 47.0099 24.4557 50.0399 27.6457C50.5999 28.2357 51.1599 28.8357 51.6899 29.4457C51.7699 29.5257 51.8399 29.6057 51.8999 29.6857C54.3599 32.4457 56.6399 35.4157 58.7699 38.6057Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M71.4401 80.7755C71.3801 81.2655 71.31 81.7455 71.23 82.2155C71.19 82.4755 71.14 82.7355 71.09 82.9855C70.6 85.7555 69.8501 88.2655 68.8301 90.5255C68.7501 90.7055 68.6701 90.8755 68.5801 91.0455C67.3401 93.6555 65.69 95.7755 63.63 97.3855L58.84 89.1155L58.77 88.9955C59.21 88.5855 59.63 88.1455 60.02 87.6655C60.97 86.5455 61.76 85.2455 62.41 83.7855C62.74 83.0555 63.02 82.2855 63.27 81.4855C63.75 80.0055 64.0901 78.3955 64.3201 76.6655L71.4401 80.7755Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M58.77 100.356C56.05 101.306 53.11 101.606 49.96 101.246C46.8 100.886 43.49 99.8957 40.02 98.2957V90.3257C40.2 90.4057 40.3801 90.4757 40.5601 90.5457C42.9001 91.4857 45.14 92.0657 47.27 92.2657C49.55 92.4957 51.71 92.2957 53.73 91.6657L58.77 100.356Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M14.68 24.5057C13.17 25.8957 11.96 27.6257 11.03 29.7157C10.1 31.8057 9.47 34.1757 9.12 36.8357L2 32.7257C2.47 29.0757 3.34005 25.8257 4.61005 22.9757C5.88005 20.1257 7.62001 17.8357 9.82001 16.1157L14.68 24.5057Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M33.2502 15.1056V23.0756C32.2102 22.6356 31.1802 22.2756 30.1702 21.9956C28.7702 21.5956 27.4101 21.3456 26.0901 21.2356C24.7301 21.1256 23.4403 21.1456 22.2003 21.3056C21.5903 21.3856 20.9902 21.4956 20.4002 21.6456C20.1702 21.7056 19.9402 21.7656 19.7102 21.8356L14.9202 13.5656L14.6802 13.1456C15.4202 12.9056 16.1602 12.7156 16.9302 12.5656C18.9902 12.1556 21.1602 12.0556 23.4402 12.2856C23.9102 12.3356 24.3802 12.3956 24.8502 12.4756C27.5502 12.8856 30.3502 13.7656 33.2502 15.1056Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M78.7701 28.606L73.9102 31.576L62.7601 37.146L53.9102 41.576L58.7701 38.606L62.5201 36.736L73.6301 31.176L78.7701 28.606Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M78.7699 28.6057L73.6299 31.1757L62.5199 36.7357L58.7699 38.6057C56.6399 35.4157 54.3599 32.4457 51.8999 29.6857C51.8399 29.6057 51.7699 29.5257 51.6899 29.4457C51.1599 28.8357 50.5999 28.2357 50.0399 27.6457C47.0099 24.4557 43.8698 21.7057 40.5898 19.4057C40.4598 19.3057 40.3199 19.2057 40.1899 19.1157L52.7 12.8557H52.7098L53.2499 12.5857L60.1899 9.11572C63.6099 11.4857 66.8899 14.3257 70.0399 17.6457C73.1999 20.9557 76.0999 24.6157 78.7699 28.6057Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M91.4403 70.776L81.3502 75.816V75.826L71.4403 80.776L64.3203 76.666L84.3203 66.666L91.4403 70.776Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M63.27 81.4857C63.02 82.2857 62.74 83.0557 62.41 83.7857C61.76 85.2457 60.97 86.5457 60.02 87.6657C59.63 88.1457 59.21 88.5857 58.77 88.9957L58.84 89.1157L53.73 91.6657C51.71 92.2957 49.55 92.4957 47.27 92.2657C45.14 92.0657 42.9001 91.4857 40.5601 90.5457C40.3801 90.4757 40.2 90.4057 40.02 90.3257L52.6801 83.9957L53.0801 83.7957L60.02 80.3257C61.13 80.7957 62.21 81.1757 63.27 81.4857Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M53.0801 76.3159V83.7959L52.6801 83.9959L40.02 90.3259V90.8159L33.0801 94.2859V86.3159L46.9501 79.3859L53.0801 76.3159Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M53.0801 76.3159L46.9501 79.3859L33.0801 86.3159C30.5901 84.4859 28.22 82.3459 25.96 79.9159C23.7 77.4859 21.56 74.8259 19.54 71.9259L33.34 65.0259V74.7159L40.28 78.7259L44.23 76.7559L50.02 73.8559C51.02 74.7359 52.0401 75.5459 53.0801 76.3159Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M60.2803 64.016V68.726L50.0203 73.856L44.2302 76.756L40.2803 78.726V54.126L49.2202 69.546L55.9103 66.196L60.2803 64.016Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M91.4399 62.806L71.4399 72.806C71.0899 68.696 70.2499 64.456 68.9199 60.106C68.8799 59.986 68.8499 59.876 68.8099 59.756C68.7899 59.686 68.7699 59.616 68.7399 59.546C68.5399 58.906 68.3299 58.266 68.1099 57.626C66.8999 54.116 65.3999 50.636 63.6299 47.186L67.4698 45.266L83.6299 37.186C85.8199 41.446 87.5899 45.746 88.9199 50.106C90.2499 54.456 91.0899 58.696 91.4399 62.806Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M71.4401 72.806L64.3201 68.706C64.0901 66.666 63.73 64.616 63.24 62.536C63.23 62.466 63.2101 62.386 63.1901 62.316C62.9601 61.346 62.7 60.366 62.41 59.386C61.82 57.366 61.11 55.346 60.28 53.346C59.81 52.216 59.31 51.086 58.77 49.956L60.28 49.096L62.4501 47.866L63.63 47.186C65.4 50.636 66.9 54.116 68.11 57.626C68.33 58.266 68.54 58.906 68.74 59.546C68.77 59.616 68.7901 59.686 68.8101 59.756C68.8501 59.876 68.88 59.986 68.92 60.106C70.25 64.456 71.0901 68.696 71.4401 72.806Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M33.3398 54.2158V54.3058L29.8199 56.3158L9.81982 66.3158L14.6798 63.5458L29.6799 56.0458L33.3398 54.2158Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M54.1702 66.8257L49.2202 69.5457L40.2802 54.1257V78.7257L33.3401 74.7157V50.1157L33.1902 50.2057L28.2202 53.0358L24.3102 55.2657L19.4502 46.7757L24.6502 43.8158L30.1302 40.6857L36.8102 36.8857L42.2602 46.2858L54.1702 66.8257Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M29.12 34.796L23.0701 37.816L9.12 44.796L2 40.686L22 30.686L29.12 34.796Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M30.1702 21.9961C29.7002 23.4861 29.3501 25.0961 29.1201 26.8361L9.12012 36.8361C9.47012 34.1761 10.1002 31.8061 11.0302 29.7161C11.9602 27.6261 13.1701 25.8961 14.6801 24.5061L20.4001 21.6461C20.9901 21.4961 21.5902 21.3861 22.2002 21.3061C23.4402 21.1461 24.7301 21.1261 26.0901 21.2361C27.4101 21.3461 28.7702 21.5961 30.1702 21.9961Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M53.2502 5.10582L39.9002 11.7858L34.6302 14.4158L33.2502 15.1058C30.3502 13.7658 27.5502 12.8858 24.8502 12.4758C24.3802 12.3958 23.9102 12.3358 23.4402 12.2858C21.1602 12.0558 18.9902 12.1558 16.9302 12.5658C16.1602 12.7158 15.4202 12.9058 14.6802 13.1458L34.6802 3.14583C37.4002 2.26583 40.3202 1.97583 43.4402 2.28583C46.5702 2.59583 49.8402 3.53582 53.2502 5.10582Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M78.77 90.3557L58.77 100.356L53.73 91.6657L58.84 89.1157L63.63 97.3857L78.53 89.9357L78.77 90.3557Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M91.4399 70.7759C90.9699 74.4259 90.11 77.6759 88.83 80.5259C87.56 83.3759 85.8199 85.6659 83.6299 87.3859L63.6299 97.3859C65.6899 95.7759 67.34 93.6559 68.58 91.0459C68.67 90.8759 68.75 90.7059 68.83 90.5259C69.85 88.2659 70.5998 85.7559 71.0898 82.9859C71.1398 82.7359 71.1899 82.4759 71.2299 82.2159C71.3099 81.7459 71.3799 81.2659 71.4399 80.7759L81.3499 75.8259L91.4399 70.7759Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M33.34 50.1157V50.7557L28.3201 53.2657L24.3101 55.2657L28.22 53.0357L33.1901 50.2057L33.34 50.1157Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M60.28 49.0956L58.77 49.9556C59.31 51.0856 59.81 52.2156 60.28 53.3456C61.11 55.3456 61.82 57.3656 62.41 59.3856C62.7 60.3656 62.9601 61.3456 63.1901 62.3156L60.28 63.7756L55.6801 66.0656L54.17 66.8256L42.26 46.2856L36.8101 36.8856L46.13 32.2256C46.29 32.3856 46.45 32.5456 46.6 32.7056C46.87 32.9756 47.14 33.2556 47.4 33.5356C49.37 35.6356 51.24 37.8856 53 40.3056C53.12 40.4656 53.23 40.6156 53.34 40.7756C53.53 41.0356 53.72 41.3056 53.91 41.5756L62.76 37.1456L67.47 45.2656L63.63 47.1856L62.4501 47.8656L60.28 49.0956Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M63.2397 62.5359L60.2798 64.0159L55.9098 66.1959L49.2197 69.5459L54.1698 66.8259L55.6798 66.0659L60.2798 63.7759L63.1898 62.3159C63.2098 62.3859 63.2297 62.4659 63.2397 62.5359Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M33.3401 50.7559V54.2159L29.6802 56.0459L14.6801 63.5459C13.1701 60.4159 11.9602 57.2759 11.0302 54.1159C10.1002 50.9659 9.47012 47.8559 9.12012 44.7959L23.0702 37.8159L29.1201 34.7959C29.3401 36.7359 29.6801 38.7059 30.1301 40.6859L24.6501 43.8159L19.4501 46.7759L24.3102 55.2659L28.3202 53.2659L33.3401 50.7559Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M20.3998 21.6459L14.6798 24.5059L9.81982 16.1159L14.9199 13.5659L19.7098 21.8359C19.9398 21.7659 20.1698 21.7059 20.3998 21.6459Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M53.25 5.10596V12.586L52.71 12.856H52.7001L40.1901 19.116V19.606L33.25 23.076V15.106L34.63 14.416L39.9 11.786L53.25 5.10596Z" stroke="currentColor" strokeLinejoin="round"/>
  </svg>
);

// Ready to send icon (has input text) - different isometric design
const ReadySendIcon = ({ className }: { className?: string }) => (
  <svg width="20" height="20" viewBox="0 0 103 82" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M56.3892 73.5254L56.4192 79.1254V73.5254H56.3892ZM90.1692 34.0454V34.1254C90.1692 34.1254 90.1792 34.0754 90.1892 34.0554C90.1892 34.0554 90.1825 34.0521 90.1692 34.0454ZM12.1592 33.6654H12.2992V33.5654C12.2492 33.5854 12.2092 33.6254 12.1592 33.6654ZM12.2992 48.0454V48.0754C12.2992 48.0754 12.2992 48.0554 12.2992 48.0454Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M100.029 28.3257V48.3257H99.8889V34.0257L90.199 34.0057C90.199 34.0057 90.189 34.0357 90.189 34.0557C90.189 34.0557 90.1823 34.0524 90.1689 34.0457V28.4157L100.029 28.3257Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M12.2991 48.0456C9.68907 46.0756 7.57899 43.9656 5.96899 41.6956C5.75899 41.4056 5.55902 41.1056 5.36902 40.8156C4.03902 38.7556 3.11901 36.6256 2.60901 34.4156C2.54901 34.1956 2.49898 33.9756 2.45898 33.7456V53.7456C2.99898 56.5156 4.16899 59.1656 5.96899 61.6956C7.76899 64.2356 10.209 66.5856 13.269 68.7556V48.7556H13.259C12.929 48.5256 12.6091 48.2856 12.2991 48.0456ZM12.2991 48.0456V48.0756C12.2991 48.0756 12.2991 48.0556 12.2991 48.0456Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M46.1091 8.55566V21.0857L33.9791 21.0657L33.9392 24.5157L33.9192 26.7157V30.6857C31.5292 31.3657 29.2591 32.1757 27.0991 33.1157V13.1157C29.9191 11.8857 32.9191 10.8857 36.1191 10.1057C39.3191 9.32567 42.6491 8.81566 46.1091 8.55566Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M96.4391 20.3355C94.5791 17.7655 92.1091 15.3955 89.0491 13.2255L82.149 17.2055C84.289 18.8455 86.029 20.6155 87.369 22.5155C88.699 24.4155 89.6391 26.3755 90.1691 28.4155L100.029 28.3255C99.4891 25.5655 98.2991 22.8955 96.4391 20.3355ZM69.839 4.97548C65.419 3.91548 60.7891 3.21549 55.9391 2.87549L55.969 8.66548C59.429 8.94548 62.7991 9.45548 66.0591 10.2155C69.3191 10.9655 72.3691 11.9655 75.1991 13.1955L82.099 9.21548C78.339 7.44548 74.249 6.02548 69.839 4.97548ZM46.0791 2.95549C41.2891 3.18549 36.7091 3.82549 32.3291 4.87549C27.9491 5.93549 23.839 7.31548 19.979 9.00548L27.099 13.1155C29.919 11.8855 32.919 10.8855 36.119 10.1055C39.319 9.32548 42.649 8.81548 46.109 8.55548L46.0791 2.95549Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M82.5092 53.0753C82.4392 53.1053 82.3692 53.1353 82.2992 53.1653C78.5092 54.8153 74.4592 56.1653 70.1592 57.1953C69.6692 57.3153 69.1792 57.4253 68.6892 57.5353H68.6692C65.5292 58.2253 62.2692 58.7053 58.9092 58.9553H58.8992C58.0792 59.0353 57.2492 59.0853 56.4192 59.1253L56.3892 53.5253C57.2192 53.4653 58.0491 53.3853 58.8691 53.2953C58.8691 53.2953 58.8992 53.2953 58.9092 53.2953C61.4692 52.9953 63.9491 52.5553 66.3691 51.9753C67.1391 51.7853 67.8992 51.5853 68.6392 51.3753C68.6592 51.3653 68.6792 51.3653 68.6892 51.3553C71.0392 50.6853 73.2692 49.8953 75.3992 48.9653L82.2992 52.9553L82.5092 53.0753Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M46.5488 59.2054C45.8588 59.1654 45.1688 59.1054 44.4888 59.0554C42.1188 58.8454 39.8188 58.5454 37.5588 58.1554C36.2088 57.9154 34.8788 57.6454 33.5688 57.3354C33.2288 57.2654 32.8988 57.1854 32.5688 57.1054C31.9088 56.9454 31.2488 56.7754 30.6088 56.5854C26.9188 55.5754 23.4588 54.2954 20.2188 52.7654L27.1188 48.7754C28.2588 49.2754 29.4188 49.7354 30.6088 50.1554C32.4488 50.8154 34.3388 51.3754 36.2988 51.8454C36.7188 51.9454 37.1388 52.0354 37.5588 52.1354C38.8088 52.3954 40.0788 52.6354 41.3788 52.8254C43.0488 53.0754 44.7688 53.2754 46.5188 53.4054L46.5388 57.8654V59.2054H46.5488Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M20.1691 44.7656V64.7656L13.269 68.7556V48.7556L20.1691 44.7656Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M82.5089 53.0757V73.0757C78.6589 74.7657 74.5389 76.1457 70.1589 77.1957C65.7889 78.2557 61.1989 78.8957 56.4189 79.1257V59.1257C57.2489 59.0857 58.0789 59.0357 58.8989 58.9557H58.9089C62.2689 58.7057 65.5289 58.2257 68.6689 57.5357H68.689C69.179 57.4257 69.6689 57.3157 70.1589 57.1957C74.4589 56.1657 78.509 54.8157 82.299 53.1657C82.369 53.1357 82.4389 53.1057 82.5089 53.0757Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M89.4088 49.0954V69.0954L82.5088 65.1053V53.0753L82.2988 52.9554V44.9854L89.4088 49.0954Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M99.8892 34.0254V54.0254C99.4992 56.7854 98.4192 59.4454 96.6392 62.0154C94.8692 64.5754 92.4592 66.9354 89.4092 69.0954V49.0954C89.7192 48.8754 90.0292 48.6454 90.3292 48.4154C92.9492 46.4454 95.0492 44.3154 96.6392 42.0154C96.8092 41.7754 96.9591 41.5354 97.1091 41.2954C98.6091 38.9554 99.5392 36.5254 99.8892 34.0254Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M99.8888 34.0254C99.5388 36.5254 98.6088 38.9554 97.1088 41.2954C96.9588 41.5354 96.8088 41.7754 96.6388 42.0154C95.0488 44.3154 92.9489 46.4454 90.3289 48.4154C90.0289 48.6454 89.7188 48.8754 89.4088 49.0954L82.2988 44.9854C83.8588 43.7854 85.2188 42.5254 86.3588 41.2054C86.7688 40.7354 87.1488 40.2554 87.4988 39.7754C88.8188 37.9654 89.7088 36.0854 90.1688 34.1254C90.1788 34.1054 90.1788 34.0754 90.1888 34.0554C90.1888 34.0354 90.1989 34.0254 90.1989 34.0054L99.8888 34.0254Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M90.1689 28.4156V34.1256C89.7089 36.0856 88.8189 37.9656 87.4989 39.7756C87.1489 40.2556 86.7689 40.7356 86.3589 41.2056C85.1889 39.7956 83.7889 38.4656 82.1489 37.2056V17.2056C84.2889 18.8456 86.0289 20.6156 87.3689 22.5156C88.6989 24.4156 89.6389 26.3756 90.1689 28.4156Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M82.0991 9.21533V29.2153L75.1992 33.1953V13.1953L82.0991 9.21533Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M75.1989 13.1955V33.1955C73.1289 32.2955 70.9288 31.5155 68.6288 30.8755L68.5988 24.6955L68.5789 21.1255L55.9688 21.1055V8.66553C59.4288 8.94553 62.7988 9.45553 66.0588 10.2155C69.3188 10.9655 72.3689 11.9655 75.1989 13.1955Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M27.099 13.1154V33.1154L20.1991 29.1354V17.0954L19.979 16.9654V9.00537L27.099 13.1154Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M20.1989 17.0957V37.0957C18.6089 38.3057 17.2488 39.5857 16.0988 40.9157C15.7188 40.4557 15.3588 39.9857 15.0388 39.5157C13.7588 37.6457 12.8589 35.6957 12.3289 33.6657H12.2988V28.0757C12.7488 26.0757 13.6488 24.1557 14.9888 22.3057C16.2888 20.5257 17.9488 18.8457 19.9788 17.2657C20.0488 17.2157 20.1189 17.1557 20.1989 17.0957Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M20.199 17.0954C20.119 17.1554 20.0489 17.2154 19.9789 17.2654C17.9489 18.8454 16.2889 20.5253 14.9889 22.3053C13.6489 24.1553 12.749 26.0753 12.299 28.0753L2.60889 28.0553C2.99889 25.2953 4.07888 22.6254 5.84888 20.0654C7.62888 17.5054 10.029 15.1454 13.079 12.9854L19.9789 16.9653L20.199 17.0954Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M12.299 28.0757V33.5657C12.249 33.5857 12.2089 33.6257 12.1589 33.6657L2.60889 33.7457V28.0557L12.299 28.0757Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M20.1688 44.7655L13.2688 48.7555C12.9388 48.5255 12.6188 48.2855 12.3088 48.0455C9.69884 46.0755 7.58876 43.9655 5.97876 41.6955C5.76876 41.4055 5.56878 41.1055 5.37878 40.8155C4.04878 38.7555 3.12877 36.6255 2.61877 34.4155C2.55877 34.1955 2.50875 33.9755 2.46875 33.7455H2.61877L12.1688 33.6655H12.3387C12.8687 35.6955 13.7688 37.6455 15.0488 39.5155C15.3688 39.9855 15.7288 40.4555 16.1088 40.9155C17.2288 42.2655 18.5788 43.5455 20.1788 44.7655H20.1688Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M46.5488 59.2056V79.2056C41.6488 78.8956 36.9888 78.1956 32.5688 77.1056C28.1488 76.0156 24.0287 74.5656 20.2188 72.7656V52.7656C23.4588 54.2956 26.9188 55.5756 30.6088 56.5856C31.2488 56.7756 31.9088 56.9456 32.5688 57.1056C32.8988 57.1856 33.2288 57.2656 33.5688 57.3356C34.8788 57.6456 36.2088 57.9156 37.5588 58.1556C39.8188 58.5456 42.1188 58.8456 44.4888 59.0556C45.1688 59.1056 45.8588 59.1656 46.5488 59.2056Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M58.9089 41.0454V53.2954C58.9089 53.2954 58.8789 53.2954 58.8689 53.2954V50.7554L58.8589 30.7554L58.9089 41.0454Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M68.6892 41.1154V51.3554C68.6892 51.3554 68.6592 51.3654 68.6392 51.3754C67.8992 51.5854 67.1391 51.7854 66.3691 51.9754C63.9491 52.5554 61.4692 52.9954 58.9092 53.2954V41.0454L68.6892 41.1154Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M58.859 30.7554V50.7554L46.5391 57.8654L46.519 53.4054C44.769 53.2754 43.049 53.0754 41.379 52.8254C40.079 52.6354 38.8091 52.3954 37.5591 52.1354V43.0554L40.989 41.0754L58.859 30.7554Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M51.9189 26.7453L33.9189 37.1353V26.7153L46.0989 26.7353H46.1089L51.9189 26.7453Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M68.689 41.1154L58.9089 41.0454L58.8589 30.7554L40.9889 41.0754L37.559 43.0554L34.1089 41.0654L33.9189 40.9554L30.6089 39.0454L33.9189 37.1354L51.9189 26.7454L46.1089 26.7354H46.0989L33.9189 26.7154L33.939 24.5154L33.9789 21.0654L46.1089 21.0854L55.9689 21.1054L68.579 21.1254L68.5989 24.6954L68.6289 30.8754L68.689 41.1154Z" stroke="currentColor" strokeLinejoin="round"/>
    <path d="M37.559 43.0554V52.1354C37.139 52.0354 36.719 51.9454 36.299 51.8454C34.339 51.3754 32.4489 50.8154 30.6089 50.1554V39.0454L33.9189 40.9554L34.1089 41.0654L37.559 43.0554Z" stroke="currentColor" strokeLinejoin="round"/>
  </svg>
);

const SUGGESTION_PAGES = [
  {
    title: 'Trending Now',
    icon: <KrackedIcon className="animate-pulse" />,
    suggestions: [
      { emoji: '🔥', text: 'Viral food spots in Bangi' },
      { emoji: '🍜', text: 'Hidden gem laksa around here' },
      { emoji: '🥩', text: 'Wagyu steak under RM100' },
      { emoji: '🧋', text: 'Best boba spot near me' },
      { emoji: '🍕', text: 'Late night pizza craving' },
      { emoji: '🌶️', text: 'Spiciest food challenge nearby' },
    ],
  },
  {
    title: 'Local Favorites',
    icon: <span className="text-xs">🇲🇾</span>,
    suggestions: [
      { emoji: '🍗', text: 'Ayam goreng paling crispy' },
      { emoji: '🍲', text: 'Sup tulang merah sedap' },
      { emoji: '🥘', text: 'Rendang tok yang legit' },
      { emoji: '🦀', text: 'Ketam butter somewhere good' },
      { emoji: '🍛', text: 'Nasi kandar power in PJ' },
      { emoji: '🥡', text: 'Char kuey teow wok hei' },
    ],
  },
  {
    title: 'Mood Based',
    icon: <span className="text-xs">💭</span>,
    suggestions: [
      { emoji: '🌧️', text: 'Comfort food for rainy day' },
      { emoji: '💼', text: 'Quick lunch under 30 mins' },
      { emoji: '🎉', text: 'Birthday dinner spot fancy' },
      { emoji: '🌙', text: 'Supper spot open till 3am' },
      { emoji: '👨‍👩‍👧', text: 'Family-friendly restaurant' },
      { emoji: '💑', text: 'Romantic date night place' },
    ],
  },
  {
    title: 'Budget Picks',
    icon: <span className="text-xs">💸</span>,
    suggestions: [
      { emoji: '🪙', text: 'Best eats under RM15' },
      { emoji: '🍱', text: 'Nasi campur paling berbaloi' },
      { emoji: '🥟', text: 'Cheap dim sum breakfast' },
      { emoji: '🌯', text: 'Student-friendly makan spot' },
      { emoji: '🍜', text: 'Ramen murah tapi sedap' },
      { emoji: '🥗', text: 'Healthy meal on budget' },
    ],
  },
];

export function ChatInput({ onSend, loading, disabled, showSuggestions = true, mobile = false }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [showChips, setShowChips] = useState(true);
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionTouchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || disabled) return;
    onSend(input.trim());
    setInput('');
    setShowChips(false);
  };

  const handleSuggestionClick = (text: string) => {
    onSend(text);
    setShowChips(false);
  };

  const nextPage = () => {
    setCurrentPage((prev) => (prev + 1) % SUGGESTION_PAGES.length);
  };

  const prevPage = () => {
    setCurrentPage((prev) => (prev - 1 + SUGGESTION_PAGES.length) % SUGGESTION_PAGES.length);
  };

  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [loading]);

  const currentPageData = SUGGESTION_PAGES[currentPage];

  const handleSuggestionTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    suggestionTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleSuggestionTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = suggestionTouchStartRef.current;
    const touch = event.changedTouches[0];
    suggestionTouchStartRef.current = null;
    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    if (deltaX < 0) nextPage();
    else prevPage();
  };

  return (
    <div className="space-y-3">
      {/* AI Suggestions with Swipe Pages */}
      {showSuggestions && showChips && !loading && (
        <div className="space-y-2 animate-slide-down">
          {/* Header with navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {currentPageData.icon}
              <span>{currentPageData.title}:</span>
            </div>
            <div className="flex items-center gap-1">
              {suggestionsExpanded && (
                <>
                  <button
                    onClick={prevPage}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <div className="flex gap-1">
                    {SUGGESTION_PAGES.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentPage(idx)}
                        className={`h-1 rounded-full transition-all ${
                          idx === currentPage
                            ? 'w-4 bg-primary'
                            : 'w-1 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                        }`}
                        aria-label={`Go to page ${idx + 1}`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={nextPage}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </>
              )}
              <button
                onClick={() => setSuggestionsExpanded(!suggestionsExpanded)}
                className="p-1 hover:bg-muted rounded transition-colors ml-1"
                aria-label={suggestionsExpanded ? "Minimize suggestions" : "Expand suggestions"}
              >
                {suggestionsExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronUp className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>

          {/* Suggestion chips */}
          {suggestionsExpanded && (
            <div
              className={mobile
                ? 'flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 animate-slide-down [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
                : 'flex flex-wrap gap-2 animate-slide-down'}
              onTouchStart={mobile ? handleSuggestionTouchStart : undefined}
              onTouchEnd={mobile ? handleSuggestionTouchEnd : undefined}
            >
              {currentPageData.suggestions.map((suggestion, idx) => (
                <button
                  key={`${currentPage}-${idx}`}
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  className={`mobbin-chip opacity-0 animate-stagger-fade stagger-${idx + 1} ${mobile ? 'min-h-11 flex-none snap-start whitespace-nowrap' : ''}`}
                  style={{ animationFillMode: 'forwards' }}
                >
                  <span>{suggestion.emoji}</span>
                  <span>{suggestion.text}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2 animate-fade-up">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="nak makan apa?"
          className={`flex-1 bg-card border-border mobbin-input ${mobile ? 'h-11 text-base' : ''}`}
          disabled={loading || disabled}
        />
        <Button 
          type="submit" 
          disabled={!input.trim() || loading || disabled}
          className={`bg-primary hover:bg-primary/90 text-primary-foreground px-4 press-effect fab ${mobile ? 'h-11 min-w-11' : ''}`}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : input.trim() ? (
            <ReadySendIcon className="text-primary-foreground transition-transform hover:scale-110" />
          ) : (
            <IdleSendIcon className="text-primary-foreground/70 transition-all" />
          )}
        </Button>
      </form>
    </div>
  );
}
