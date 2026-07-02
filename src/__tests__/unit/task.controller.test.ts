import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import type { Task } from "@prisma/client";

// Mock the service module
vi.mock("../../services/task.service.js", () => ({
	findAll: vi.fn(),
	findById: vi.fn(),
	create: vi.fn(),
	update: vi.fn(),
	remove: vi.fn(),
}));

import * as taskService from "../../services/task.service.js";
import * as taskController from "../../controllers/task.controller.js";

const mockService = vi.mocked(taskService);

const mockTask: Task = {
	id: 1,
	title: "Test Task",
	description: "Test description",
	completed: false,
	createdAt: new Date("2026-01-01T00:00:00.000Z"),
	updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

function createMockResponse(): Response {
	const res = {
		status: vi.fn().mockReturnThis(),
		json: vi.fn().mockReturnThis(),
		send: vi.fn().mockReturnThis(),
	} as unknown as Response;
	return res;
}

function createMockRequest(overrides: Partial<Request> = {}): Request {
	return {
		params: {},
		body: {},
		query: {},
		...overrides,
	} as unknown as Request;
}

describe("TaskController", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getAllTasks", () => {
		it("should return 200 with all tasks", async () => {
			const tasks = [mockTask];
			mockService.findAll.mockResolvedValue(tasks);
			const req = createMockRequest();
			const res = createMockResponse();

			await taskController.getAllTasks(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(tasks);
		});

		it("should return 500 when the service throws", async () => {
			mockService.findAll.mockRejectedValue(new Error("DB down"));
			const req = createMockRequest();
			const res = createMockResponse();

			await taskController.getAllTasks(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch tasks" });
		});
	});

	describe("getTaskById", () => {
		it("should return 200 with the task", async () => {
			mockService.findById.mockResolvedValue(mockTask);
			const req = createMockRequest({ params: { id: "1" } } as any);
			const res = createMockResponse();

			await taskController.getTaskById(req, res);

			expect(mockService.findById).toHaveBeenCalledWith(1);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(mockTask);
		});

		it("should return 400 when the id is not a number", async () => {
			const req = createMockRequest({ params: { id: "abc" } } as any);
			const res = createMockResponse();

			await taskController.getTaskById(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(mockService.findById).not.toHaveBeenCalled();
		});

		it("should return 404 when the task does not exist", async () => {
			mockService.findById.mockResolvedValue(null);
			const req = createMockRequest({ params: { id: "999" } } as any);
			const res = createMockResponse();

			await taskController.getTaskById(req, res);

			expect(res.status).toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith({ error: "Task not found" });
		});
	});

	describe("createTask", () => {
		it("should return 201 with the created task", async () => {
			mockService.create.mockResolvedValue(mockTask);
			const req = createMockRequest({
				body: { title: "Test Task", description: "Test description" },
			} as any);
			const res = createMockResponse();

			await taskController.createTask(req, res);

			expect(mockService.create).toHaveBeenCalledWith({
				title: "Test Task",
				description: "Test description",
			});
			expect(res.status).toHaveBeenCalledWith(201);
			expect(res.json).toHaveBeenCalledWith(mockTask);
		});

		it("should trim the title before creating the task", async () => {
			mockService.create.mockResolvedValue(mockTask);
			const req = createMockRequest({
				body: { title: "  Padded title  " },
			} as any);
			const res = createMockResponse();

			await taskController.createTask(req, res);

			expect(mockService.create).toHaveBeenCalledWith({
				title: "Padded title",
				description: undefined,
			});
		});

		it("should return 400 when the title is missing", async () => {
			const req = createMockRequest({ body: {} } as any);
			const res = createMockResponse();

			await taskController.createTask(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(mockService.create).not.toHaveBeenCalled();
		});

		it("should return 400 when the title is an empty string", async () => {
			const req = createMockRequest({ body: { title: "   " } } as any);
			const res = createMockResponse();

			await taskController.createTask(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(mockService.create).not.toHaveBeenCalled();
		});
	});

	describe("updateTask", () => {
		it("should return 200 with the updated task", async () => {
			const updatedTask = { ...mockTask, completed: true };
			mockService.update.mockResolvedValue(updatedTask);
			const req = createMockRequest({
				params: { id: "1" },
				body: { completed: true },
			} as any);
			const res = createMockResponse();

			await taskController.updateTask(req, res);

			expect(mockService.update).toHaveBeenCalledWith(1, {
				title: undefined,
				description: undefined,
				completed: true,
			});
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(updatedTask);
		});

		it("should return 400 when the id is invalid", async () => {
			const req = createMockRequest({ params: { id: "abc" }, body: {} } as any);
			const res = createMockResponse();

			await taskController.updateTask(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(mockService.update).not.toHaveBeenCalled();
		});

		it("should return 404 when the task does not exist", async () => {
			mockService.update.mockRejectedValue(new Error("Task not found"));
			const req = createMockRequest({
				params: { id: "999" },
				body: { title: "Nope" },
			} as any);
			const res = createMockResponse();

			await taskController.updateTask(req, res);

			expect(res.status).toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith({ error: "Task not found" });
		});
	});

	describe("deleteTask", () => {
		it("should return 204 when the task is deleted", async () => {
			mockService.remove.mockResolvedValue(mockTask);
			const req = createMockRequest({ params: { id: "1" } } as any);
			const res = createMockResponse();

			await taskController.deleteTask(req, res);

			expect(mockService.remove).toHaveBeenCalledWith(1);
			expect(res.status).toHaveBeenCalledWith(204);
			expect(res.send).toHaveBeenCalled();
		});

		it("should return 400 when the id is invalid", async () => {
			const req = createMockRequest({ params: { id: "abc" } } as any);
			const res = createMockResponse();

			await taskController.deleteTask(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(mockService.remove).not.toHaveBeenCalled();
		});

		it("should return 404 when the task does not exist", async () => {
			mockService.remove.mockRejectedValue(new Error("Task not found"));
			const req = createMockRequest({ params: { id: "999" } } as any);
			const res = createMockResponse();

			await taskController.deleteTask(req, res);

			expect(res.status).toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith({ error: "Task not found" });
		});
	});
});
