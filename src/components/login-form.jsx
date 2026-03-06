"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RowsIcon } from "@phosphor-icons/react"

export function LoginForm({
  className,
  ...props
}) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <a href="#" className="flex flex-col items-center gap-2 font-medium">
              <div className="flex size-8 items-center justify-center rounded-md">
                <img src="/logo.png" alt="Airi Logo" className="size-8" />
              </div>
              <span className="sr-only">Airi Inc.</span>
            </a>
            <h1 className="text-xl font-bold">Welcome to Airi.</h1>
          </div>
          <Field className="grid gap-6">
            <Button variant="outline" type="button" onClick={() => window.location.href = "/auth/login"}>
              <img src="https://raw.githubusercontent.com/varshney-ansh/slew/refs/heads/main/public/favicons/android-chrome-512x512.png" alt="slew_logo" width="24px" height="24px" />
              Register with Slew
            </Button>
          </Field>
        </FieldGroup>
      </form>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  );
}
