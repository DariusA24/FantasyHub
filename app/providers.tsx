'use client'
import { ThemeProvider } from "./theme-provider"
import { Toaster } from "../components/ui/sonner"

function Providers({children}:{children:React.ReactNode}) {
  return (
    <>
    <Toaster />
    <ThemeProvider 
        attribute="class" 
        defaultTheme="dark" 
        forcedTheme="dark"    // Add forced theme
        enableSystem={false} 
        disableTransitionOnChange>
      {children}
      </ThemeProvider>
    </>
  )
}

export default Providers