import "@testing-library/jest-dom/vitest";

process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.STORAGE_DB_PATH = process.env.STORAGE_DB_PATH || ":memory:";
