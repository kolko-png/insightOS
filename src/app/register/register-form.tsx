'use client';

import { useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@/lib/validation/auth.schema';
import { register as registerAction, resumeRegistration } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const BUSINESS_ROLES = [
  { value: 'ceo', label: 'CEO' },
  { value: 'finance_manager', label: 'Finance Manager' },
  { value: 'sales_manager', label: 'Sales Manager' },
  { value: 'operations', label: 'Operations' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'hr', label: 'HR' },
  { value: 'business_owner', label: 'Business Owner' },
] as const;

export function RegisterForm() {
  const searchParams = useSearchParams();
  const isResume = searchParams.get('resume') === 'true';
  const message = searchParams.get('message');

  const [error, setError] = useState<string | null>(
    message === 'check_email'
      ? 'Check your email for a confirmation link.'
      : null
  );
  const [isPending, startTransition] = useTransition();

  const {
    register: registerField,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      businessRole: 'business_owner',
    },
  });

  function onSubmit(data: RegisterInput) {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value);
      });

      const result = await registerAction(null, formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  function handleResume() {
    setError(null);
    startTransition(async () => {
      const result = await resumeRegistration();
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-[20px] font-semibold tracking-tight text-foreground">
            {isResume ? 'Set up your workspace' : 'Create your account'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isResume
              ? 'Create a workspace to get started.'
              : 'Enter your details to get started.'}
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {isResume ? (
          <Button
            onClick={handleResume}
            className="w-full"
            disabled={isPending}
          >
            {isPending ? 'Creating workspace…' : 'Create my workspace'}
          </Button>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                placeholder="Jane Doe"
                autoComplete="name"
                disabled={isPending}
                aria-invalid={!!errors.fullName}
                {...registerField('fullName')}
              />
              {errors.fullName && (
                <p className="text-xs text-destructive">{errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="workspaceName">Workspace name</Label>
              <Input
                id="workspaceName"
                placeholder="Acme Corp"
                autoComplete="organization"
                disabled={isPending}
                aria-invalid={!!errors.workspaceName}
                {...registerField('workspaceName')}
              />
              {errors.workspaceName && (
                <p className="text-xs text-destructive">{errors.workspaceName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                disabled={isPending}
                aria-invalid={!!errors.email}
                {...registerField('email')}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={isPending}
                aria-invalid={!!errors.password}
                {...registerField('password')}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={isPending}
                aria-invalid={!!errors.confirmPassword}
                {...registerField('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Business role</Label>
              <Controller
                name="businessRole"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      disabled={isPending}
                      aria-invalid={!!errors.businessRole}
                    >
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.businessRole && (
                <p className="text-xs text-destructive">
                  {errors.businessRole.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          {isResume ? (
            <Link href="/login" className="underline hover:text-foreground">
              Sign in to a different account
            </Link>
          ) : (
            <>
              Already have an account?{' '}
              <Link href="/login" className="underline hover:text-foreground">
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
