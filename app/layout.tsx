import './globals.css';
import type { Metadata } from 'next';
export const metadata:Metadata={title:'Herzliah Alumni Network',description:'Private professional network for verified Herzliah alumni.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
