
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UseFormReturn } from "react-hook-form";
import * as z from "zod";

interface ProfileBasicInfoProps {
  form: UseFormReturn<z.infer<any>>;
  usernameLocked?: boolean;
  usernameRemainingDays?: number;
}

export function ProfileBasicInfo({
  form,
  usernameLocked,
  usernameRemainingDays,
}: ProfileBasicInfoProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="username"
        render={({ field }) => (
          <FormItem>
            <FormLabel htmlFor="username">Nombre de usuario</FormLabel>
            <FormControl>
              <Input 
                id="username" 
                {...field} 
                autoComplete="username" 
                disabled={Boolean(usernameLocked)}
              />
            </FormControl>
            {Boolean(usernameLocked) && (
              <div className="text-xs text-muted-foreground">
                Podrás cambiar tu nombre en {usernameRemainingDays ?? 0} día(s).
              </div>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="bio"
        render={({ field }) => (
          <FormItem>
            <FormLabel htmlFor="bio">Biografía</FormLabel>
            <FormControl>
              <Textarea 
                id="bio" 
                {...field} 
                rows={4} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
