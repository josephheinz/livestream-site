import type { Metadata } from 'next';
import { Archivo_Black, Space_Grotesk, Space_Mono } from 'next/font/google';
import './globals.css';
import { MotionConfig } from 'motion/react';
import { ClerkProvider } from '@clerk/nextjs';
import { shadcn } from '@clerk/ui/themes';
import ConvexClientProvider from '@/components/ConvexClientProvider';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { ThemeScript } from '@/components/theme/theme-script';
import { AuthModalProvider } from '@/components/site/auth-modal';

const spaceGrotesk = Space_Grotesk({
	variable: '--font-space-grotesk',
	subsets: ['latin'],
	weight: ['400', '500', '700']
});

const spaceMono = Space_Mono({
	variable: '--font-space-mono',
	subsets: ['latin'],
	weight: ['400', '700']
});

const archivoBlack = Archivo_Black({
	variable: '--font-archivo-black',
	subsets: ['latin'],
	weight: '400'
});

export const metadata: Metadata = {
	title: 'NIGHTCHANNEL',
	description: 'A continuous single-camera broadcast — softened neobrutalism livestream.'
};

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<ThemeScript />
			</head>
			<body className={`${spaceGrotesk.variable} ${spaceMono.variable} ${archivoBlack.variable} antialiased`}>
				<ThemeProvider>
					<MotionConfig reducedMotion="user">
						<AuthModalProvider>
							<ClerkProvider appearance={{ theme: shadcn }}>
								<ConvexClientProvider>{children}</ConvexClientProvider>
							</ClerkProvider>
						</AuthModalProvider>
					</MotionConfig>
				</ThemeProvider>
			</body>
		</html>
	);
}
