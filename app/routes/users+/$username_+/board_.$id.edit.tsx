import { invariant, invariantResponse } from '@epic-web/invariant'
import { type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import {
	action,
	BoardEditor,
} from '#app/routes/users+/$username_+/board+/__board-editor'
import { requireUserId } from '#app/utils/auth.server'
import { getBoardData } from './board_.$id_+/queries'

export async function loader({ request, params }: LoaderFunctionArgs) {
	let userId = await requireUserId(request)

	invariant(params.id, 'Missing board ID')
	let id = Number(params.id)

	let board = await getBoardData(id, userId)
	invariantResponse(board, 'Board not found', { status: 404 })

	return { board }
}

export { action }

export default function Edit() {
	const { board } = useLoaderData<typeof loader>()
	return (
		<div className="container rounded-lg bg-slate-100">
			<BoardEditor board={board} />
		</div>
	)
}
