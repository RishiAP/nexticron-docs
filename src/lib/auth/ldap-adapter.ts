/**
 * LDAP authentication adapter.
 *
 * Performs direct LDAP communication (bind + search)
 * against the FreeIPA LDAP directory.
 *
 * Environment variables:
 *   LDAP_URL                  — LDAP/LDAPS URL (e.g. ldaps://ipa.example.com:636)
 *   LDAP_BASE_DN              — Base DN (e.g. dc=example,dc=com)
 *   LDAP_USER_DN_TEMPLATE     — User DN template containing {username}
 *                                (default: uid={username},cn=users,cn=accounts,<LDAP_BASE_DN>)
 *   LDAP_GROUP_ATTRIBUTE      — Group membership attribute (default: memberOf)
 *   LDAP_UID_ATTRIBUTE        — UID attribute (default: uid)
 *   LDAP_DISPLAY_NAME_ATTRIBUTE — Display name attribute (default: cn)
 *   LDAP_EMAIL_ATTRIBUTE      — Email attribute (default: mail)
 *   LDAP_ALLOW_INSECURE_TLS   — Set to true to skip TLS cert verification (default: false)
 *   LDAP_SERVICE_BIND_DN      — Service account DN for read-only LDAP lookups (refresh flow)
 *   LDAP_SERVICE_BIND_PASSWORD — Service account password
 *   FREEIPA_DOCS_ADMIN_GROUP  — Group name that grants global docs admin (default: docs-admins)
 */

import { Client } from "ldapts"
import type { AuthAdapter, AuthenticateResult } from "./types"

export class LdapAdapter implements AuthAdapter {
  private readonly ldapUrl: string
  private readonly baseDn: string
  private readonly userDnTemplate: string
  private readonly groupAttribute: string
  private readonly uidAttribute: string
  private readonly displayNameAttribute: string
  private readonly emailAttribute: string
  private readonly allowInsecureTls: boolean
  private readonly serviceBindDn: string | undefined
  private readonly serviceBindPassword: string | undefined
  private readonly docsAdminGroup: string

  constructor() {
    const ldapUrl = process.env.LDAP_URL
    const baseDn = process.env.LDAP_BASE_DN

    if (!ldapUrl) {
      throw new Error("LDAP_URL environment variable is required")
    }
    if (!baseDn) {
      throw new Error("LDAP_BASE_DN environment variable is required")
    }

    this.ldapUrl = ldapUrl
    this.baseDn = baseDn
    this.userDnTemplate =
      process.env.LDAP_USER_DN_TEMPLATE ??
      `uid={username},cn=users,cn=accounts,${this.baseDn}`
    this.groupAttribute = process.env.LDAP_GROUP_ATTRIBUTE ?? "memberOf"
    this.uidAttribute = process.env.LDAP_UID_ATTRIBUTE ?? "uid"
    this.displayNameAttribute =
      process.env.LDAP_DISPLAY_NAME_ATTRIBUTE ?? "cn"
    this.emailAttribute = process.env.LDAP_EMAIL_ATTRIBUTE ?? "mail"
    this.allowInsecureTls =
      (process.env.LDAP_ALLOW_INSECURE_TLS ?? "false").toLowerCase() === "true"
    this.serviceBindDn = process.env.LDAP_SERVICE_BIND_DN
    this.serviceBindPassword = process.env.LDAP_SERVICE_BIND_PASSWORD
    this.docsAdminGroup = process.env.FREEIPA_DOCS_ADMIN_GROUP ?? "docs-admins"

    if (!this.userDnTemplate.includes("{username}")) {
      throw new Error(
        "LDAP_USER_DN_TEMPLATE must include the {username} placeholder",
      )
    }
  }

  async authenticate(
    username: string,
    password: string,
  ): Promise<AuthenticateResult> {
    const client = new Client({
      url: this.ldapUrl,
      timeout: 10000,
      connectTimeout: 10000,
      tlsOptions: this.allowInsecureTls
        ? { rejectUnauthorized: false }
        : undefined,
    })

    try {
      const userDn = this.userDnTemplate.replaceAll("{username}", username)

      await client.bind(userDn, password)
      const entry = await this.fetchUserEntry(client, userDn)

      const uid = this.pickFirstString(entry[this.uidAttribute]) ?? username
      const displayName =
        this.pickFirstString(entry[this.displayNameAttribute]) ?? username
      const email = this.pickFirstString(entry[this.emailAttribute]) ?? ""

      const rawGroups = this.toStringArray(entry[this.groupAttribute])
      const groups = rawGroups.map((value) => this.extractGroupName(value))

      // FreeIPA stores krbLastPwdChange as a generalizedTime string (YYYYMMDDHHmmssZ)
      const krbRaw = this.pickFirstString(entry["krbLastPwdChange"])
      const krbLastPwdChange = krbRaw
        ? this.parseGeneralizedTime(krbRaw)
        : null

      return {
        success: true,
        user: {
          uid,
          displayName,
          email,
          groups,
          krbLastPwdChange,
        },
      }
    } catch (error) {
      if (this.isInvalidCredentials(error)) {
        return {
          success: false,
          error: "Invalid username or password",
        }
      }

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "LDAP authentication failed",
      }
    } finally {
      try {
        await client.unbind()
      } catch {
        // no-op
      }
    }
  }

  /** Check if a set of groups implies global docs admin status */
  isAdmin(groups: string[]): boolean {
    const target = this.docsAdminGroup.toLowerCase()
    return groups.some((group) => group.toLowerCase() === target)
  }

  /**
   * Fetch user groups and password-change timestamp using the service bind account.
   * Used during refresh token flow to re-check permissions
   * without knowing the user's password.
   *
   * Returns groups and the UNIX timestamp (seconds) of the last password change
   * (`krbLastPwdChange` in FreeIPA).  Returns `null` for the timestamp when
   * the attribute is absent.
   */
  async fetchUserGroups(
    username: string,
  ): Promise<{ groups: string[]; krbLastPwdChange: number | null }> {
    if (!this.serviceBindDn || !this.serviceBindPassword) {
      throw new Error(
        "LDAP_SERVICE_BIND_DN and LDAP_SERVICE_BIND_PASSWORD are required for service bind",
      )
    }

    const client = new Client({
      url: this.ldapUrl,
      timeout: 10000,
      connectTimeout: 10000,
      tlsOptions: this.allowInsecureTls
        ? { rejectUnauthorized: false }
        : undefined,
    })

    try {
      await client.bind(this.serviceBindDn, this.serviceBindPassword)

      const userDn = this.userDnTemplate.replaceAll("{username}", username)
      const entry = await this.fetchUserEntry(client, userDn)
      const rawGroups = this.toStringArray(entry[this.groupAttribute])
      const groups = rawGroups.map((value) => this.extractGroupName(value))

      // FreeIPA stores krbLastPwdChange as a generalizedTime string (YYYYMMDDHHmmssZ)
      const krbRaw = this.pickFirstString(entry["krbLastPwdChange"])
      const krbLastPwdChange = krbRaw
        ? this.parseGeneralizedTime(krbRaw)
        : null

      return { groups, krbLastPwdChange }
    } finally {
      try {
        await client.unbind()
      } catch {
        // no-op
      }
    }
  }

  /**
   * Parse a LDAP generalizedTime string (YYYYMMDDHHmmssZ) into a UNIX
   * timestamp in seconds.  Returns null if the format is unrecognised.
   */
  private parseGeneralizedTime(value: string): number | null {
    // FreeIPA format: 20260301120000Z
    const m = value.match(
      /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/,
    )
    if (!m) return null
    const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`
    const ms = Date.parse(iso)
    return Number.isNaN(ms) ? null : Math.floor(ms / 1000)
  }

  private async fetchUserEntry(
    client: Client,
    userDn: string,
  ): Promise<Record<string, unknown>> {
    const { searchEntries } = await client.search(userDn, {
      scope: "base",
      filter: "(objectClass=*)",
      attributes: [
        this.uidAttribute,
        this.displayNameAttribute,
        this.emailAttribute,
        this.groupAttribute,
        "krbLastPwdChange",
      ],
    })

    if (searchEntries.length === 0) {
      throw new Error("LDAP user entry not found")
    }

    return searchEntries[0] as Record<string, unknown>
  }

  private toStringArray(value: unknown): string[] {
    if (value == null) return []

    if (typeof value === "string") {
      return [value]
    }

    if (value instanceof Buffer) {
      return [value.toString("utf8")]
    }

    if (Array.isArray(value)) {
      return value
        .map((item) => {
          if (typeof item === "string") return item
          if (item instanceof Buffer) return item.toString("utf8")
          return ""
        })
        .filter(Boolean)
    }

    return []
  }

  private pickFirstString(value: unknown): string | undefined {
    return this.toStringArray(value)[0]
  }

  private extractGroupName(groupValue: string): string {
    const cnMatch = groupValue.match(/(?:^|,)cn=([^,]+)/i)
    return cnMatch?.[1] ?? groupValue
  }

  private isInvalidCredentials(error: unknown): boolean {
    if (!error || typeof error !== "object") return false

    const typed = error as {
      message?: string
      code?: string | number
      lde_message?: string
    }

    if (typed.code === 49 || typed.code === "49") {
      return true
    }

    const message = `${typed.message ?? ""} ${typed.lde_message ?? ""}`.toLowerCase()
    return message.includes("invalid credentials")
  }
}
