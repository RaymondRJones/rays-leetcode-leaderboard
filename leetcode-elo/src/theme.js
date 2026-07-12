import { createTheme } from '@mui/material/styles';

const palette = {
  bg: '#07080a',
  surface: '#0d0f12',
  surface2: '#14171b',
  surface3: '#1b2026',
  line: '#262b31',
  line2: '#3a414a',
  text: '#f3f4f1',
  muted: '#a7adb4',
  faint: '#70777f',
  green: '#35c486',
  pink: '#ef5da8',
  purple: '#8b5cf6',
  amber: '#e6b450',
};

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: palette.green,
      contrastText: palette.bg,
    },
    secondary: {
      main: palette.pink,
      contrastText: palette.bg,
    },
    warning: {
      main: palette.amber,
    },
    background: {
      default: palette.bg,
      paper: palette.surface,
    },
    divider: palette.line,
    text: {
      primary: palette.text,
      secondary: palette.muted,
      disabled: palette.faint,
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: [
      'Inter',
      'ui-sans-serif',
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'sans-serif',
    ].join(','),
    h3: {
      fontWeight: 660,
      letterSpacing: 0,
      lineHeight: 1,
    },
    h4: {
      fontWeight: 660,
      letterSpacing: 0,
      lineHeight: 1.08,
    },
    h5: {
      fontWeight: 650,
      letterSpacing: 0,
    },
    h6: {
      fontWeight: 650,
      letterSpacing: 0,
    },
    button: {
      fontWeight: 650,
      letterSpacing: 0,
      textTransform: 'none',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          boxSizing: 'border-box',
        },
        html: {
          minWidth: 320,
          backgroundColor: palette.bg,
        },
        body: {
          minWidth: 320,
          minHeight: '100vh',
          background: `linear-gradient(180deg, rgba(20, 23, 27, 0.72), transparent 420px), ${palette.bg}`,
          color: palette.text,
        },
        a: {
          color: 'inherit',
          textDecoration: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(7, 8, 10, 0.78)',
          borderBottom: `1px solid ${palette.line}`,
          boxShadow: 'none',
          backdropFilter: 'blur(18px)',
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: '64px',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 40,
          borderRadius: 8,
          boxShadow: 'none',
          textTransform: 'none',
          transition: 'background 160ms ease, border-color 160ms ease, transform 160ms ease',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        containedPrimary: {
          background: palette.text,
          color: palette.bg,
          '&:hover': {
            background: 'rgba(243, 244, 241, 0.9)',
          },
        },
        outlined: {
          borderColor: palette.line,
          color: palette.text,
          '&:hover': {
            borderColor: palette.line2,
            background: palette.surface2,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: `1px solid ${palette.line}`,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(13, 15, 18, 0.72)',
          borderColor: palette.line,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          minHeight: 42,
          backgroundColor: 'transparent',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: palette.line,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: palette.line2,
          },
          '&.Mui-focused': {
            backgroundColor: 'rgba(20, 23, 27, 0.68)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: palette.line2,
            borderWidth: 1,
          },
        },
      },
    },
    MuiFilledInput: {
      styleOverrides: {
        root: {
          border: `1px solid ${palette.line}`,
          borderRadius: 8,
          backgroundColor: 'rgba(7, 8, 10, 0.44)',
          '&::before, &::after': {
            display: 'none',
          },
          '&:hover': {
            backgroundColor: 'rgba(20, 23, 27, 0.78)',
          },
          '&.Mui-focused': {
            backgroundColor: 'rgba(20, 23, 27, 0.78)',
            borderColor: palette.line2,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: palette.muted,
          '&.Mui-focused': {
            color: palette.text,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          height: 24,
          borderRadius: 999,
          fontWeight: 700,
        },
        outlined: {
          borderColor: palette.line2,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: palette.surface,
          border: `1px solid ${palette.line}`,
        },
      },
    },
    MuiList: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent',
        },
      },
    },
  },
});

export { palette };
export default theme;
