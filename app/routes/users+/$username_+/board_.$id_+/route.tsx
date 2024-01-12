import { invariant, invariantResponse } from '@epic-web/invariant'
import {
	type MetaFunction,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'

import { badRequest } from '#app/http/bad-request'
import { requireUserId } from '#app/utils/auth.server'
import { Board } from './board'
import {
	createColumn,
	updateColumnName,
	deleteColumn,
	getBoardData,
	upsertItem,
	updateBoardName,
	deleteCard,
} from './queries'
import { INTENTS } from './types'
import { parseItemMutation } from './utils'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const boardId = Number(params.id)
	invariant(boardId, 'Missing board ID')

	let board = await getBoardData(boardId, userId)
	invariantResponse(board, 'Board not found', { status: 404 })

	return { board }
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
	return [{ title: `${data ? data.board.name : 'Board'} | Trellix` }]
}

export { Board as default }

export async function action({ request, params }: ActionFunctionArgs) {
	let accountId = await requireUserId(request)
	let boardId = Number(params.id)
	invariant(boardId, 'Missing boardId')

	let formData = await request.formData()
	let intent = formData.get('intent')

	if (!intent) throw badRequest('Missing intent')

	switch (intent) {
		case INTENTS.deleteCard: {
			let id = String(formData.get('itemId') || '')
			await deleteCard(id, accountId)
			break
		}
		case INTENTS.updateBoardName: {
			let name = String(formData.get('name') || '')
			invariant(name, 'Missing name')
			await updateBoardName(boardId, name, accountId)
			break
		}
		case INTENTS.moveItem:
		case INTENTS.createItem: {
			let mutation = parseItemMutation(formData)
			await upsertItem({ ...mutation, boardId }, accountId)
			break
		}
		case INTENTS.createColumn: {
			let { name, id } = Object.fromEntries(formData)
			invariant(name, 'Missing name')
			invariant(id, 'Missing id')
			await createColumn(boardId, String(name), String(id), accountId)
			break
		}
		case INTENTS.updateColumn: {
			let { name, columnId } = Object.fromEntries(formData)
			if (!name || !columnId) throw badRequest('Missing name or columnId')
			await updateColumnName(String(columnId), String(name), accountId)
			break
		}
		case INTENTS.deleteColumn: {
			let { columnId } = Object.fromEntries(formData)
			if (!columnId) throw badRequest('Missing columnId')
			await deleteColumn(String(columnId), accountId)
			break
		}
		default: {
			throw badRequest(`Unknown intent: ${intent}`)
		}
	}

	return { ok: true }
}
