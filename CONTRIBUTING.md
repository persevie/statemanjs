# Contributing

First off, thank you for considering contributing to statemanjs 🤗

## Where do I go from here?

If you've noticed a bug or have a feature request - please check whether the same issue already exists in the [list of issues](https://github.com/persevie/statemanjs/issues). If you don't find the issue there, [create a new one](https://github.com/persevie/statemanjs/issues/new/choose)!
It's generally best if you get confirmation of your bug or approval for your feature request this way before starting to code.

The issue tracker is only for bugs and feature requests.

If you have general questions about statemanjs, or if you want to discuss the project and get involved in its future, we invite you to [Discussions](https://github.com/persevie/statemanjs/discussions).

## Fork & create a branch

If this is something you think you can fix, then [fork statemanjs](https://github.com/persevie/statemanjs/fork) and create
a branch with a descriptive name.

A good branch name would be (where issue #123 is the ticket you're working on):

```sh
git checkout -b 123-<branch-name>
```

## Get the style and quality right

Your code should follow the same conventions and pass the same code quality checks as the rest of the project.

## Sending a Pull Request

1. Add the main repository for the `statemanjs` library as a remote repository with the name `upstream`.
2. Install dependencies for development.
3. Fetch the latest changes.
4. Make changes.
5. Record the changes according to [conventional rules](#commit-rules).
6. Fetch the latest changes.
7. Send the changes to GitHub.
8. Send a Pull Request.
9. Link the Pull Request and issue with keyword] in the comment. Example: `feat #8`

## Commit rules

Record the changes made by making comments in accordance with [Conventional Commits](https://conventionalcommits.org).

```
<type>(optional scope): <description>
```

### Allowed `<type>`

-   **chore** - maintain
-   **ci** - ci configuration
-   **feat** - new feature
-   **fix** - bug fix
-   **docs** - documentation
-   **style** - formatting, missing semi colons, …
-   **test** - when adding missing tests
-   **perf** - performance improvements
-   **revert** - rollback changes
-   **refactor** - reorganization without breaking changes and new features

### Style for `<description>`

-   only English language
-   use imperative, present tense: `change` not `changed` nor `changes`
-   no dot (`.`) at the end
-   use lowercase commit message
