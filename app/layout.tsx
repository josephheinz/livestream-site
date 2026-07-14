import type { Metadata } from 'next';
import { Archivo_Black, Space_Grotesk, Space_Mono } from 'next/font/google';
import './globals.css';
import { MotionConfig } from 'motion/react';
import { ClerkProvider } from '@clerk/nextjs';
import { shadcn } from '@clerk/ui/themes';
import ConvexClientProvider from '@/components/ConvexClientProvider';
import { AuthModalProvider } from '@/components/site/auth-modal';
import { AnnouncementModal } from '@/components/site/announcement-modal';
import { AudienceEffects } from '@/components/site/audience-effects';

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
	title: 'Joseph Heinz',
	description: 'Live from josephheinz.live — softened neobrutalism.'
};

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		// Dark-only: light mode removed; the .dark palette is the site's palette.
		<html lang="en" className="dark">
			<body className={`${spaceGrotesk.variable} ${spaceMono.variable} ${archivoBlack.variable} antialiased`}>
				<MotionConfig reducedMotion="user">
					<ClerkProvider appearance={{ theme: shadcn }}>
						<ConvexClientProvider>
							<AuthModalProvider>{children}</AuthModalProvider>
							<AnnouncementModal />
							<AudienceEffects />
						</ConvexClientProvider>
					</ClerkProvider>
				</MotionConfig>
			</body>
		</html>
	);
}
