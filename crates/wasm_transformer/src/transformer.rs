// Main transformation logic

use crate::applier::*;
use crate::generator::*;
use crate::parser::*;

use std::*;
use std::path::{Path, PathBuf};

// Function to lower i64 imports for a Wasm binary vec
pub fn lower_i64_wasm_for_wasi_js(mut wasm_binary_vec: &mut Vec<u8>) -> Result<(), &'static str> {
    // First parse the Wasm vec
    let parsed_info = parse_wasm_vec(&mut wasm_binary_vec);

    // Get our imported wasm_functions
    let imported_i64_function_filter = parsed_info
        .wasm_functions
        .iter()
        .filter(|x| x.is_import && (x.has_i64_param || x.has_i64_returns));

    if imported_i64_function_filter.clone().count() < 1 {
        // We have no imports to lower.
        return Ok(());
    }

    // Get our imported functions
    let imported_i64_functions: Vec<_> = imported_i64_function_filter.clone().collect();

    // Generate our trampolines and signatures
    let (trampoline_functions, lowered_signatures) = generate_trampolines_and_signatures(
        &mut wasm_binary_vec,
        &imported_i64_functions,
        &parsed_info.wasm_type_signatures,
    );

    // Update the binary to point at the trampoline and signatures
    // This should be done in order, in order to not have to do continuous passes of the position.
    // https://github.com/WebAssembly/design/blob/master/BinaryEncoding.md#high-level-structure
    apply_transformations_to_wasm_binary_vec(
        &mut wasm_binary_vec,
        &imported_i64_functions,
        &trampoline_functions,
        &lowered_signatures,
        &parsed_info.wasm_sections,
        &parsed_info.wasm_type_signatures,
        &parsed_info.wasm_functions,
        &parsed_info.wasm_calls,
    )
}

#[cfg(test)]
#[test]
fn converts() {
    // Run tests for the following strings
    let mut test_file_paths = Vec::new();
    // test_file_paths.push("./wasm_module_examples/path_open.wasm");
    // test_file_paths.push("./wasm_module_examples/clock_time_get.wasm");
    // test_file_paths.push("./wasm_module_examples/matrix.wasm");
    // test_file_paths.push("./wasm_module_examples/two-imports.wasm");
    // test_file_paths.push("./wasm_module_examples/gettimeofday/gettimeofday.wasm");
    // test_file_paths.push("./wasm_module_examples/qjs.wasm");
    // test_file_paths.push("./wasm_module_examples/duk.wasm");
    test_file_paths.push("./wasm_module_examples/rsign_original.wasm");

    fs::create_dir_all("./wasm_module_examples_transformed/").unwrap();

    for test_file_path in test_file_paths.iter() {
        console_log!(" ");
        console_log!("=======================================");

        console_log!(" ");
        console_log!("Testing: {:?}", test_file_path);
        console_log!(" ");

        let mut wasm = fs::read(test_file_path).unwrap();

        wasmparser::validate(&wasm, None).expect("original Wasm is not valid");

        console_log!(" ");
        console_log!("Original Wasm Size: {}", &wasm.len());
        console_log!(" ");

        lower_i64_wasm_for_wasi_js(&mut wasm).unwrap();

        console_log!(" ");
        console_log!("New Wasm Size: {}", &wasm.len());
        console_log!(" ");

        let filename =  Path::new(test_file_path).file_name().unwrap().to_string_lossy();
        let transformed_filename = format!("./wasm_module_examples_transformed/{}", filename);
        fs::write(transformed_filename.clone(), &wasm).expect("Unable to write file");

        console_log!(" ");
        console_log!("Wrote resulting Wasm to: {}", transformed_filename.clone());
        console_log!(" ");

        console_log!(" ");
        console_log!("Convert Back to Wat for descriptive errors (if there is one)");
        console_log!(" ");

        let transformed_wat = wabt::wasm2wat(wasm.to_vec());

        match transformed_wat {
            Err(e) => {
                console_log!(" ");
                console_log!("Test File Path: {:?}", test_file_path);
                console_log!(" ");
                console_log!("{:?}", e);
                console_log!(" ");
            }
            Ok(wat) => {
                fs::write("./wasm_module_examples/test_result.wat", wat)
                    .expect("Unable to write file");

                console_log!(" ");
                console_log!("Wrote resulting Wat to: ./wasm_module_examples/test_result.wat");
                console_log!(" ");
            }
        }

        let validated = wasmparser::validate(&wasm, None);
        assert!(
            !validated.is_err(),
            "converted Wasm is not valid: {:?}",
            validated.err()
        );
    }
}
