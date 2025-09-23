"use client";

import axios from "axios";
import { getApiBaseUrl } from "@/lib/utils";

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export type ApiResponse<T> = {
  message?: string;
  data?: T;
};


