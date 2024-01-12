import { invariant } from '@epic-web/invariant'
import { type LoaderFunctionArgs } from '@remix-run/node'
import { Link, useFetcher, useLoaderData, useSubmit } from '@remix-run/react'

import { useRef } from 'react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { Button } from '#app/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '#app/components/ui/dialog'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuPortal,
	DropdownMenuTrigger,
} from '#app/components/ui/dropdown-menu'
import { Icon } from '#app/components/ui/icon'
import { getUserById, requireUserId } from '#app/utils/auth.server'
import { INTENTS } from '../board_.$id_+/types'
import { BoardEditor, action } from './__board-editor'
import { getHomeData } from './queries'

export const meta = () => {
	return [{ title: 'Boards' }]
}

export async function loader({ request }: LoaderFunctionArgs) {
	let userId = await requireUserId(request)
	let boards = await getHomeData(userId)
	const user = await getUserById(userId)
	invariant(user, 'User not found')
	return { boards, user }
}

export { action }

export default function Projects() {
	return (
		<div className="flex h-full flex-col gap-4">
			<Boards />
		</div>
	)
}

function Boards() {
	let { boards, user } = useLoaderData<typeof loader>()

	return (
		<div className="container">
			<h2 className="mb-2 text-xl font-bold">Boards</h2>
			<nav className="flex flex-wrap gap-8">
				<div className="flex place-items-center">
					<Dialog>
						<DialogTrigger asChild>
							<Button variant="secondary">
								<Icon name="plus">Create new board</Icon>
							</Button>
						</DialogTrigger>
						<DialogContent>
							<BoardEditor />
						</DialogContent>
					</Dialog>
				</div>

				{boards.map(board => (
					<BoardCard
						key={board.id}
						name={board.name}
						id={board.id}
						color={board.color}
						userName={user.username}
					/>
				))}
			</nav>
		</div>
	)
}

function BoardCard({
	name,
	id,
	color,
	userName,
}: {
	name: string
	id: number
	color: string
	userName: string
}) {
	let fetcher = useFetcher()
	let isDeleting = fetcher.state !== 'idle'
	return isDeleting ? null : (
		<div className="relative">
			<div className="absolute right-4 top-4">
				<BoardActionsDropDown board={{ id, name, color }} userName={userName} />
			</div>

			<Link
				to={`/users/${userName}/board/${id}`}
				className="block h-40 w-60 rounded border-b-8 bg-white p-4 font-bold shadow hover:shadow-lg"
				style={{ borderColor: color }}
			>
				{name}
			</Link>
		</div>
	)
}

function BoardActionsDropDown({
	board,
	userName,
}: {
	board: {
		name: string
		id: number
		color: string
	}
	userName: string
}) {
	const submit = useSubmit()
	const formRef = useRef<HTMLFormElement>(null)
	const fetcher = useFetcher<typeof action>()
	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button asChild variant="ghost" size="sm">
						<div className="flex items-center gap-2">
							<Icon name="dots-horizontal" />
						</div>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuPortal>
					<DropdownMenuContent sideOffset={8} align="start">
						<DropdownMenuItem asChild>
							<Link
								prefetch="intent"
								to={`/users/${userName}/board/${board.id}/edit`}
								className="flex gap-2 align-bottom"
							>
								<Icon className="text-body-md" name="pencil-2" size="sm">
									Edit
								</Icon>
							</Link>
						</DropdownMenuItem>
						<DropdownMenuItem
							asChild
							// this prevents the menu from closing before the form submission is completed
							onSelect={event => {
								event.preventDefault()
								submit(formRef.current)
							}}
						>
							<div className="">
								<Icon className="text-body-md" name="trash" size="sm">
									Trash
								</Icon>
							</div>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenuPortal>
			</DropdownMenu>
			<fetcher.Form method="POST" ref={formRef}>
				<AuthenticityTokenInput />
				<input type="hidden" name="intent" value={INTENTS.deleteBoard} />
				<input type="hidden" name="boardId" value={board.id} />
			</fetcher.Form>
		</>
	)
}
