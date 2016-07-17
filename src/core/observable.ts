import {IDerivation, notifyDependencyReady, notifyDependencyStale} from "./derivation";
import {globalState} from "./globalstate";
import {FastSet} from "../utils/set";

export interface IDepTreeNode {
	name: string;
	observers?: FastSet<IDerivation>;
	observing?: FastSet<IObservable>;
}

export interface IObservable extends IDepTreeNode {
	diffValue: number;
	laRunId: number;
	staleObservers: IDerivation[];
	observers: FastSet<IDerivation>;
	onBecomeObserved();
	onBecomeUnobserved();
}

export function addObserver(observable: IObservable, node: IDerivation) {
	const l = observable.observers.length;
	observable.observers.add(node);
	if (l === 0)
		observable.onBecomeObserved();
}

export function removeObserver(observable: IObservable, node: IDerivation) {
	observable.observers.remove(node);
	if (observable.observers.length === 0)
		observable.onBecomeUnobserved(); // TODO: test if this happens only once, e.g. remove returns bool!
}

export function reportObserved(observable: IObservable) {
	if (globalState.isTracking === false)
		return;
	const derivation = globalState.derivationStack[globalState.derivationStack.length - 1];
	/**
	 * Simple optimization, give each derivation run an unique id (runId)
	 * Check if last time this observable was accessed the same runId is used
	 * if this is the case, the relation is already known
	 */
	if (derivation.runId !== observable.laRunId) {
		observable.laRunId = derivation.runId;
		derivation.observing.add(observable);
	}
}

export function propagateStaleness(observable: IObservable|IDerivation) {
	const os = observable.observers.asArray();
	os.forEach(notifyDependencyStale);
	observable.staleObservers = observable.staleObservers.concat(os); // TODO: could be faster if this was set as well?
}

export function propagateReadiness(observable: IObservable|IDerivation, valueDidActuallyChange: boolean) {
	observable.staleObservers.splice(0).forEach(
		o => notifyDependencyReady(o, valueDidActuallyChange)
	);
}
