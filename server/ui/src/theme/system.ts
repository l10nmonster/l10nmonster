import { createSystem, defineConfig } from "@chakra-ui/react"

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: "#e3f2fd" },
          100: { value: "#bbdefb" },
          200: { value: "#90caf9" },
          300: { value: "#64b5f6" },
          400: { value: "#42a5f5" },
          500: { value: "#1976d2" }, // Primary blue from MUI
          600: { value: "#1565c0" },
          700: { value: "#0d47a1" },
          800: { value: "#1976d2" },
          900: { value: "#0d47a1" },
          950: { value: "#0a3f73" }
        }
      }
    }
  }
})

export const customSystem = createSystem(config) 