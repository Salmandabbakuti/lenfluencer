// import './globals.css';

export const metadata = {
  title: 'Lenfluencer',
  description: 'Lenfluencer is a platform to reward creators for their work.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
