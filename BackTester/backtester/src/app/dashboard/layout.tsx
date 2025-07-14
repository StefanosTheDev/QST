import NavBar from '../_components/navBar/NavBar';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="root-layout">
      <NavBar />
      {children}
    </div>
  );
}
