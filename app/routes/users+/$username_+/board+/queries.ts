import { prisma } from '#app/utils/db.server'

export async function deleteBoard(boardId: number, userId: string) {
	return prisma.board.delete({
		where: { id: boardId, userId },
	})
}

export async function createBoard(userId: string, name: string, color: string) {
	return prisma.board.create({
		data: {
			name,
			color,
			user: {
				connect: {
					id: userId,
				},
			},
		},
	})
}

export async function updateBoard(
	boardId: number,
	name: string,
	color: string,
) {
	return prisma.board.update({
		where: { id: boardId },
		data: {
			name,
			color,
		},
	})
}

export async function getHomeData(userId: string) {
	return prisma.board.findMany({
		where: {
			userId,
		},
		orderBy: {
			createdAt: 'asc',
		},
	})
}
