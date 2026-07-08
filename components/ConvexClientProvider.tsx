'use client';

import { ReactNode, useEffect } from 'react';
import { Authenticated, ConvexReactClient, useMutation } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { useAuth } from '@clerk/nextjs';
import { api } from '../convex/_generated/api';

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
	throw new Error('Missing NEXT_PUBLIC_CONVEX_URL in your .env file');
}

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);

/** Session-time users-row upsert — the dev/webhook-gap path (see users.ensure). */
function EnsureUser() {
	const ensure = useMutation(api.users.ensure);
	useEffect(() => {
		void ensure();
	}, [ensure]);
	return null;
}

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
	return (
		<ConvexProviderWithClerk client={convex} useAuth={useAuth}>
			<Authenticated>
				<EnsureUser />
			</Authenticated>
			{children}
		</ConvexProviderWithClerk>
	);
}
