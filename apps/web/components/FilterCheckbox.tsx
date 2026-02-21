type FilterCheckboxProps = {
	id: string;
	label: string;
	checked: boolean;
	onToggle: (checked: boolean) => void;
};

export function FilterCheckbox({
	id,
	label,
	checked,
	onToggle,
}: FilterCheckboxProps) {
	return (
		<label
			htmlFor={id}
			className="inline-flex items-center gap-1 rounded-full border border-primary-200 bg-white px-2 py-1 text-primary-700"
		>
			<input
				id={id}
				type="checkbox"
				checked={checked}
				onChange={(event) => onToggle(event.target.checked)}
			/>
			<span>{label}</span>
		</label>
	);
}
