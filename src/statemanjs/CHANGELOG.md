# Changelog

## [1.8.0] - 2025-10-28

### Added

#### Core Features

- **Computed Scheduler**: Implemented global deferred computed scheduler (`computedScheduler.ts`) that resolves diamond dependency problems by ensuring computed values are recomputed only once per update wave
- **Update Generation Tracking**: Added `UpdateGeneration` class to prevent duplicate recomputations in complex dependency graphs
- **Batching Support**: New `batch` option in `StatemanjsOptions` enables microtask-based batching of subscriber notifications for better performance
- **FinalizationRegistry Integration**: Automatic cleanup of garbage-collected subscribers prevents memory leaks without manual unsubscribe calls
- **Lazy Computed Evaluation**: Computed states now calculate values only when accessed or when they have active subscribers

#### Performance Optimizations

- **Primitive Fast-Path**: Ultra-fast code path for primitive state values (numbers, strings, booleans) bypassing Proxy overhead
- **WeakMap-Based Proxy Cache**: Replaced string-based Map cache with WeakMap for automatic garbage collection and better memory management
- **String-Based Path Tracking**: Optimized property path tracking using string concatenation instead of arrays (faster and less memory)
- **Precompiled Comparators**: Comparator functions are now precompiled at initialization to avoid switch statements in hot paths
- **Array Accessor Method Proxying**: Added support for tracking changes through array methods: `find()`, `filter()`, `map()`, `at()`, `slice()`, `concat()`, `reduce()`, `reduceRight()`, `flatMap()`
- **Lazy Computed Recomputation**: Computed states now skip recomputation when no subscribers are active, saving CPU cycles
- **Diamond Dependency Resolution**: Deferred scheduler ensures computed states in diamond-shaped dependency graphs receive correct values without glitches or duplicate recomputations

#### API Enhancements

- **Computed Dependencies**: `createComputedState` now accepts both `StatemanjsAPI` and `StatemanjsComputedAPI` as dependencies, enabling computed chains
- **Deep Clone in Unwrap**: `unwrap()` method now returns a deep clone using `structuredClone` (with JSON fallback) to prevent accidental mutations
- **Skip Generation Increment**: Internal `skipGenerationIncrement` option for computed states to avoid generation counter interference
- **Cyclic Dependency Detection**: Added cycle detection in computed states with clear error messages preventing infinite loops

### Changed

#### Breaking Changes

- **File Structure**: Moved shared entities and utilities to `shared/` directory:
    - `entities.ts` → `shared/entities.ts`
    - `utility.ts` → `shared/utility.ts`
- **Jest Config**: Converted TypeScript Jest configs to JavaScript (`jest.config.ts` → `jest.config.js`) for better compatibility

#### Internal Improvements

- **Path Representation**: Internal property paths now use dot-separated strings instead of arrays for better performance
- **Subscriber Notification**: Refactored subscriber notification logic to support both synchronous and batched modes
- **Proxy Handler**: Simplified proxy handler logic by removing unnecessary path manipulations
- **Error Handling**: Improved error messages for cyclic dependencies and primitive state updates

### Tests

- Added test for `unwrap()` method behavior
- Added tests for array accessor methods (`find()`, `filter()`, `map()`, `at()`, `slice()`)
- Added Vue integration test for hook usage outside component scope
- All existing tests pass with new optimizations

### Documentation

- Updated README with architectural requirements section ("Why Statemanjs")
- Added detailed performance benchmarks
- Documented diamond dependency resolution and scheduler implementation

### Build & Tooling

- Fixed module imports in build scripts (added `.js` extensions for CommonJS compatibility)
- Updated test runner to use `.js` config files
- Improved publish script with proper file extension handling

---
