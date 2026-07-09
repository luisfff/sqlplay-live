import * as react from 'react';

interface SqlConsoleProps {
    /** Height of the embedded console (CSS length). Default "80vh". */
    height?: string | number;
    /** Extra class on the wrapper element. */
    className?: string;
}
/** The full SQLPlay console, mountable anywhere in a React app. */
declare function SqlConsole({ height, className }: SqlConsoleProps): react.JSX.Element;

export { SqlConsole, type SqlConsoleProps, SqlConsole as default };
