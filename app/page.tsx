'use client';

import { Authenticated, Unauthenticated } from 'convex/react';
import { SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';

export default function Home() {
	return (
		<div className="min-h-screen flex flex-col">
			<header className="flex items-center justify-between px-6 py-4 border-b">
				<span className="font-semibold text-lg">Life EOS App</span>
				<nav className="flex items-center gap-3">
					<Unauthenticated>
						<SignInButton mode="modal">
							<button className="rounded-md px-4 py-2 text-sm font-medium border hover:bg-foreground/5 transition-colors">
								Sign in
							</button>
						</SignInButton>
						<SignUpButton mode="modal">
							<button className="rounded-md px-4 py-2 text-sm font-medium bg-foreground text-background hover:opacity-90 transition-opacity">
								Sign up
							</button>
						</SignUpButton>
					</Unauthenticated>
					<Authenticated>
						<UserButton />
					</Authenticated>
				</nav>
			</header>

			<main className="flex-1 flex flex-col items-center justify-center gap-6 px-6 text-center">
				<Unauthenticated>
					<h1 className="text-3xl font-bold">Welcome to the Life EOS App</h1>
					<p className="text-foreground/70 max-w-md">
						Sign in or create an account to get started.
					</p>
				</Unauthenticated>
				<Authenticated>
					<Content />
				</Authenticated>
			</main>
		</div>
	);
}

function Content() {
	const me = useQuery(api.users.me);
	return (
		<div className="flex flex-col items-center gap-2">
			<h1 className="text-3xl font-bold">You&apos;re signed in 🎉</h1>
			<p className="text-foreground/70">Welcome{me ? `, ${me.name}` : ''}!</p>
		</div>
	);
}
